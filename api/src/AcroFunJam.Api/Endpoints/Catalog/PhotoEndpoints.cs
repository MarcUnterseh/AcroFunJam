using System.Security.Claims;
using AcroFunJam.Api.Authorization;
using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.AddPosePhoto;
using AcroFunJam.Application.Catalog.ChooseMainPhoto;
using AcroFunJam.Application.Catalog.CorrectPhoto;
using AcroFunJam.Application.Catalog.GetPhotoRendition;
using AcroFunJam.Application.Catalog.RemovePosePhoto;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>
/// The photos of the poses (story 10, ADR 0039): added in <c>multipart/form-data</c> (file, altText, credit, rightsConfirmed),
/// managed by the validators and the administrators, and their generated sizes served to everybody under the origin of the API.
/// </summary>
public static class PhotoEndpoints
{
    public static RouteGroupBuilder MapPhotoEndpoints(this RouteGroupBuilder catalog)
    {
        ArgumentNullException.ThrowIfNull(catalog);

        catalog.MapPost("/poses/{id:guid}/photos", AddPhoto)
            .WithName("AddPosePhoto")
            .RequireAuthorization(Capabilities.CanManagePhotos)
            // The site and the API share their origin and the cookie is SameSite=Strict (ADR 0011): no antiforgery token.
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitMetadata(PhotoForm.RequestLimit))
            .Accepts<IFormFile>("multipart/form-data")
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status413PayloadTooLarge);

        catalog.MapPut("/poses/{id:guid}/photos/main", ChooseMainPhoto)
            .WithName("ChooseMainPhoto")
            .RequireAuthorization(Capabilities.CanManagePhotos)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        catalog.MapPut("/poses/{id:guid}/photos/{photoId:guid}", CorrectPhoto)
            .WithName("CorrectPhoto")
            .RequireAuthorization(Capabilities.CanManagePhotos)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        catalog.MapDelete("/poses/{id:guid}/photos/{photoId:guid}", RemovePhoto)
            .WithName("RemovePosePhoto")
            .RequireAuthorization(Capabilities.CanManagePhotos)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        catalog.MapGet("/photos/{photoId:guid}/{size}", GetPhoto)
            .WithName("GetPhoto")
            .AllowAnonymous()
            .Produces(StatusCodes.Status200OK, contentType: "image/webp")
            .ProducesProblem(StatusCodes.Status404NotFound);

        return catalog;
    }

    internal static PhotoResponse ToResponse(PresentedPhoto photo) =>
        new(photo.Id.Value, photo.AltText, photo.Credit, photo.Width, photo.Height,
            new PhotoSourcesResponse(photo.Sources.Thumbnail, photo.Sources.Page, photo.Sources.Enlarged));

    /// <summary>
    /// The form is read here (<see cref="PhotoForm"/>), so that a body over the limit is refused as <c>photo.too-large</c> (413),
    /// like a file over 10 MiB; the texts and the file are checked by the use case.
    /// </summary>
    private static async Task<Results<Created<PhotoResponse>, ProblemHttpResult>> AddPhoto(
        Guid id, HttpRequest request, ClaimsPrincipal principal, ICommandHandler<AddPosePhoto, PresentedPhoto> handler, CancellationToken ct)
    {
        var form = await PhotoForm.Read(request, ct);
        if (form.IsFailure) return form.Error!.ToProblem();

        var (content, altText, credit, rightsConfirmed) = form.Value!;
        var added = await handler.Handle(
            new AddPosePhoto(new PoseId(id), content, altText, credit, rightsConfirmed,
                new CatalogManagerId(Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!))),
            ct);
        if (added.IsFailure) return added.Error!.ToProblem();
        return TypedResults.Created(added.Value!.Sources.Page, ToResponse(added.Value!));
    }

    private static async Task<Results<NoContent, ProblemHttpResult>> ChooseMainPhoto(
        Guid id, MainPhotoRequest request, ICommandHandler<ChooseMainPhoto, PhotoId> handler, CancellationToken ct)
    {
        var chosen = await handler.Handle(new ChooseMainPhoto(new PoseId(id), new PhotoId(request.PhotoId)), ct);
        return chosen.IsFailure ? chosen.Error!.ToProblem() : TypedResults.NoContent();
    }

    private static async Task<Results<Ok<PhotoResponse>, ProblemHttpResult>> CorrectPhoto(
        Guid id, Guid photoId, CorrectPhotoRequest request, ICommandHandler<CorrectPhoto, PresentedPhoto> handler, CancellationToken ct)
    {
        var corrected = await handler.Handle(new CorrectPhoto(new PoseId(id), new PhotoId(photoId), request.AltText, request.Credit), ct);
        return corrected.IsFailure ? corrected.Error!.ToProblem() : TypedResults.Ok(ToResponse(corrected.Value!));
    }

    private static async Task<Results<NoContent, ProblemHttpResult>> RemovePhoto(
        Guid id, Guid photoId, ICommandHandler<RemovePosePhoto, PhotoId> handler, CancellationToken ct)
    {
        var removed = await handler.Handle(new RemovePosePhoto(new PoseId(id), new PhotoId(photoId)), ct);
        return removed.IsFailure ? removed.Error!.ToProblem() : TypedResults.NoContent();
    }

    /// <summary>
    /// A generated size, immutable for its identifier: cached for a year (ADR 0039). A removed photo is no longer found, even by
    /// its address; a browser that cached it may still show it.
    /// </summary>
    private static async Task<Results<FileStreamHttpResult, ProblemHttpResult>> GetPhoto(
        Guid photoId, string size, HttpResponse response, IQueryHandler<GetPhotoRendition, Stream> handler, CancellationToken ct)
    {
        if (RenditionOf(size) is not { } rendition) return CatalogErrors.PhotoNotFound.ToProblem();
        var content = await handler.Handle(new GetPhotoRendition(new PhotoId(photoId), rendition), ct);
        if (content.IsFailure) return content.Error!.ToProblem();

        // private: no shared cache (proxy, CDN) keeps a removed photo; a CDN with purge will come with its own decision.
        response.Headers.CacheControl = "private, max-age=31536000, immutable";
        response.Headers.XContentTypeOptions = "nosniff";
        return TypedResults.Stream(content.Value!, "image/webp");
    }

    private static PhotoRendition? RenditionOf(string size) => size switch
    {
        "thumbnail" => PhotoRendition.Thumbnail,
        "page" => PhotoRendition.Page,
        "enlarged" => PhotoRendition.Enlarged,
        _ => null,
    };
}

/// <summary>The photo chosen as the main photo of a pose.</summary>
public sealed record MainPhotoRequest(Guid PhotoId);

/// <summary>The corrected alternative text and credit of a photo (story 10, R14).</summary>
public sealed record CorrectPhotoRequest(string? AltText, string? Credit);

/// <summary>The addresses of the generated sizes, served by <see cref="PhotoEndpoints"/> (ADR 0039).</summary>
internal sealed class ApiPhotoAddresses : IPhotoAddresses
{
    public PhotoSources Of(PhotoId photo) => new(
        $"/catalog/photos/{photo.Value}/thumbnail", $"/catalog/photos/{photo.Value}/page", $"/catalog/photos/{photo.Value}/enlarged");
}

/// <summary>The limit of the body of a request, for one endpoint (ADR 0039).</summary>
internal sealed class RequestSizeLimitMetadata(long limit) : IRequestSizeLimitMetadata
{
    public long? MaxRequestBodySize => limit;
}
