using System.Security.Claims;
using AcroFunJam.Api.Authorization;
using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.AddTransitionVideo;
using AcroFunJam.Application.Catalog.CorrectTransitionVideo;
using AcroFunJam.Application.Catalog.GetTransitionVideos;
using AcroFunJam.Application.Catalog.GetVideoContent;
using AcroFunJam.Application.Catalog.RemoveTransitionVideo;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Infrastructure.Videos;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Net.Http.Headers;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>
/// The videos of the transitions (story 12, ADR 0041): added in <c>multipart/form-data</c> (caption, credit, description,
/// rightsConfirmed, then file), listed, corrected and removed by the validators and the administrators; the prepared video and its
/// poster served to everybody under the origin of the API, by ranges when asked.
/// </summary>
public static class VideoEndpoints
{
    /// <summary>The policy of the rate limiter of the additions: 2 sendings at the same time at most (ADR 0041).</summary>
    public const string UploadsLimit = "video-uploads";

    public static RouteGroupBuilder MapVideoEndpoints(this RouteGroupBuilder catalog)
    {
        ArgumentNullException.ThrowIfNull(catalog);

        catalog.MapPost("/transitions/{transitionId:guid}/videos", AddVideo)
            .WithName("AddTransitionVideo")
            .RequireAuthorization(Capabilities.CanManageVideos)
            // The site and the API share their origin and the cookie is SameSite=Strict (ADR 0011): no antiforgery token.
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitMetadata(VideoForm.RequestLimit))
            .RequireRateLimiting(UploadsLimit)
            .Accepts<IFormFile>("multipart/form-data")
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status413PayloadTooLarge)
            .ProducesProblem(StatusCodes.Status503ServiceUnavailable);

        catalog.MapGet("/transitions/{transitionId:guid}/videos", GetVideos)
            .WithName("GetTransitionVideos")
            .RequireAuthorization(Capabilities.CanManageVideos)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        catalog.MapPut("/transitions/{transitionId:guid}/videos/{videoId:guid}", CorrectVideo)
            .WithName("CorrectTransitionVideo")
            .RequireAuthorization(Capabilities.CanManageVideos)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        catalog.MapDelete("/transitions/{transitionId:guid}/videos/{videoId:guid}", RemoveVideo)
            .WithName("RemoveTransitionVideo")
            .RequireAuthorization(Capabilities.CanManageVideos)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        catalog.MapGet("/videos/{videoId:guid}/{file}", GetVideoFile)
            .WithName("GetVideoFile")
            .AllowAnonymous()
            .Produces(StatusCodes.Status200OK, contentType: "video/mp4")
            .Produces(StatusCodes.Status206PartialContent, contentType: "video/mp4")
            .Produces(StatusCodes.Status416RangeNotSatisfiable)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return catalog;
    }

    internal static VideoResponse ToResponse(PresentedVideo video) =>
        new(video.Id.Value, video.Caption, video.Credit, video.Description, video.Width, video.Height, video.DurationMs,
            PreparationCode(video.Preparation),
            video.Sources is { } sources ? new VideoSourcesResponse(sources.Video, sources.Poster) : null);

    /// <summary>The codes of the preparation in the HTTP contract (ADR 0041); a client tolerates an unknown one.</summary>
    private static string PreparationCode(VideoPreparation preparation) => preparation switch
    {
        VideoPreparation.InPreparation => "in-preparation",
        VideoPreparation.Ready => "ready",
        VideoPreparation.Failed => "failed",
        _ => throw new ArgumentOutOfRangeException(nameof(preparation), preparation, "Unknown preparation."),
    };

    /// <summary>
    /// The form is read here (<see cref="VideoForm"/>), its file streamed to a temporary file deleted at the end of the request,
    /// whatever happens; the texts, the file and the transition are checked by the use case. Answered once checked, before the
    /// preparation (202).
    /// </summary>
    private static async Task<Results<Accepted<VideoResponse>, ProblemHttpResult>> AddVideo(
        Guid transitionId, HttpRequest request, ClaimsPrincipal principal, VideoProcessingOptions options,
        ICommandHandler<AddTransitionVideo, PresentedVideo> handler, CancellationToken ct)
    {
        var form = await VideoForm.Read(request, options.UploadDirectory, ct);
        if (form.IsFailure) return form.Error!.ToProblem();

        await using var sent = form.Value!;
        var added = await handler.Handle(
            new AddTransitionVideo(new TransitionId(transitionId), sent.File, sent.Caption, sent.Credit, sent.Description, sent.RightsConfirmed,
                new CatalogManagerId(Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!))),
            ct);
        if (added.IsFailure) return added.Error!.ToProblem();
        return TypedResults.Accepted($"/catalog/transitions/{transitionId}/videos", ToResponse(added.Value!));
    }

    private static async Task<Results<Ok<VideoListResponse>, ProblemHttpResult>> GetVideos(
        Guid transitionId, HttpResponse response, IQueryHandler<GetTransitionVideos, IReadOnlyList<PresentedVideo>> handler, CancellationToken ct)
    {
        var videos = await handler.Handle(new GetTransitionVideos(new TransitionId(transitionId)), ct);
        if (videos.IsFailure) return videos.Error!.ToProblem();
        response.Headers.CacheControl = "private, no-cache";
        return TypedResults.Ok(new VideoListResponse([.. videos.Value!.Select(ToResponse)]));
    }

    private static async Task<Results<Ok<VideoResponse>, ProblemHttpResult>> CorrectVideo(
        Guid transitionId, Guid videoId, CorrectVideoRequest request, ICommandHandler<CorrectTransitionVideo, PresentedVideo> handler,
        CancellationToken ct)
    {
        var corrected = await handler.Handle(
            new CorrectTransitionVideo(new TransitionId(transitionId), new VideoId(videoId), request.Caption, request.Credit, request.Description), ct);
        return corrected.IsFailure ? corrected.Error!.ToProblem() : TypedResults.Ok(ToResponse(corrected.Value!));
    }

    private static async Task<Results<NoContent, ProblemHttpResult>> RemoveVideo(
        Guid transitionId, Guid videoId, ICommandHandler<RemoveTransitionVideo, VideoId> handler, CancellationToken ct)
    {
        var removed = await handler.Handle(new RemoveTransitionVideo(new TransitionId(transitionId), new VideoId(videoId)), ct);
        return removed.IsFailure ? removed.Error!.ToProblem() : TypedResults.NoContent();
    }

    /// <summary>
    /// A prepared file, immutable for its identifier: cached for a year (ADR 0041). A single range gives 206, several ranges the
    /// whole file, a range outside the file 416; <c>If-Range</c> is compared to the ETag. A removed video, or one not ready, is
    /// not found, even by its address (V16).
    /// </summary>
    private static async Task<IResult> GetVideoFile(
        Guid videoId, string file, HttpRequest request, IQueryHandler<GetVideoContent, VideoContent> handler, CancellationToken ct)
    {
        if (RenditionOf(file) is not { } rendition) return CatalogErrors.VideoNotFound.ToProblem();
        var etag = new EntityTagHeaderValue($"\"{videoId:N}-{file}\"");
        var ifRange = request.Headers.IfRange.ToString();
        var range = string.IsNullOrEmpty(ifRange) || ifRange == etag.Tag.Value ? VideoRanges.RangeOf(request.Headers.Range) : null;

        var content = await handler.Handle(new GetVideoContent(new VideoId(videoId), rendition, range), ct);
        if (content.IsFailure) return content.Error!.ToProblem();
        return new VideoFileResult(content.Value!, rendition == VideoRendition.Video ? "video/mp4" : "image/webp", etag);
    }

    private static VideoRendition? RenditionOf(string file) => file switch
    {
        "video" => VideoRendition.Video,
        "poster" => VideoRendition.Poster,
        _ => null,
    };

    /// <summary>Writes a prepared file, or its asked range, with the headers of a partial response (ADR 0041).</summary>
    private sealed class VideoFileResult(VideoContent content, string contentType, EntityTagHeaderValue etag) : IResult
    {
        public async Task ExecuteAsync(HttpContext httpContext)
        {
            var response = httpContext.Response;
            response.Headers.AcceptRanges = "bytes";
            response.Headers.ETag = etag.ToString();
            // private: no shared cache (proxy, CDN) keeps a removed video; a CDN with purge will come with its own decision.
            response.Headers.CacheControl = "private, max-age=31536000, immutable";
            response.Headers.XContentTypeOptions = "nosniff";

            if (content.Content is not { } stream)
            {
                response.StatusCode = StatusCodes.Status416RangeNotSatisfiable;
                response.Headers.ContentRange = $"bytes */{content.TotalLength}";
                return;
            }

            await using (stream)
            {
                response.ContentType = contentType;
                if (content.Range is var (first, last))
                {
                    response.StatusCode = StatusCodes.Status206PartialContent;
                    response.Headers.ContentRange = $"bytes {first}-{last}/{content.TotalLength}";
                    response.ContentLength = last - first + 1;
                }
                else
                {
                    response.StatusCode = StatusCodes.Status200OK;
                    response.ContentLength = content.TotalLength;
                }

                await stream.CopyToAsync(response.Body, httpContext.RequestAborted);
            }
        }
    }
}

/// <summary>The corrected caption, credit and description of a video (story 12, V17, V23); an empty description removes it.</summary>
public sealed record CorrectVideoRequest(string? Caption, string? Credit, string? Description);

/// <summary>The videos of a transition, whatever their preparation, in the order of addition (ADR 0041).</summary>
public sealed record VideoListResponse(IReadOnlyList<VideoResponse> Videos);

/// <summary>
/// A video of a transition (story 12, ADR 0041): its presented dimensions (planned while in preparation), its duration, its
/// preparation (<c>ready</c>, <c>in-preparation</c>, <c>failed</c>; a client tolerates an unknown one), and the addresses of the
/// video and of its poster, none until it is ready. The confirmation of the rights is never given.
/// </summary>
public sealed record VideoResponse(
    Guid Id, string Caption, string Credit, string? Description, int Width, int Height, long DurationMs, string Preparation,
    VideoSourcesResponse? Sources);

/// <summary>The addresses of a prepared video and of its poster, under the origin of the API (ADR 0041).</summary>
public sealed record VideoSourcesResponse(string Video, string Poster);

/// <summary>The addresses of the prepared files, served by <see cref="VideoEndpoints"/> (ADR 0041).</summary>
internal sealed class ApiVideoAddresses : IVideoAddresses
{
    public VideoSources Of(VideoId video) => new($"/catalog/videos/{video.Value}/video", $"/catalog/videos/{video.Value}/poster");
}
