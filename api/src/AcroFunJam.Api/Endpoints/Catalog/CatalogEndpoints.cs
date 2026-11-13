using AcroFunJam.Application.Catalog.GetPublishedPose;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Application.Common;
using AcroFunJam.Api.Endpoints.Common;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AcroFunJam.Api.Endpoints.Catalog;

public static class CatalogEndpoints
{
    public static IEndpointRouteBuilder MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var catalog = app.MapGroup("/catalog").WithTags("Catalog");

        catalog.MapGet("/poses", ListPublishedPoses)
            .WithName("ListPublishedPoses")
            .AllowAnonymous();

        catalog.MapGet("/poses/{id:guid}", GetPublishedPose)
            .WithName("GetPublishedPose")
            .AllowAnonymous()
            .ProducesProblem(StatusCodes.Status404NotFound);

        return app;
    }

    private static async Task<Results<Ok<PoseListResponse>, ProblemHttpResult>> ListPublishedPoses(
        IQueryHandler<ListPublishedPoses, IReadOnlyList<PublishedPoseSummary>> handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(new ListPublishedPoses(), ct);
        if (result.IsFailure)
        {
            return TypedResults.Problem(detail: result.Error!.Message, title: result.Error.Code);
        }

        return TypedResults.Ok(new PoseListResponse([.. result.Value!.Select(ToResponse)]));
    }

    /// <summary>A published pose with its version, to start a revision of it (story 6, ADR 0024).</summary>
    private static async Task<Results<Ok<PublishedPoseResponse>, ProblemHttpResult>> GetPublishedPose(
        Guid id,
        IQueryHandler<GetPublishedPose, PublishedPoseDetails> handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(new GetPublishedPose(new PoseId(id)), ct);
        if (result.IsFailure) return result.Error!.ToProblem();

        var pose = result.Value!;
        return TypedResults.Ok(new PublishedPoseResponse(
            pose.Id.Value,
            pose.Name.Value,
            DifficultyCodes.From(pose.Difficulty.Base),
            DifficultyCodes.From(pose.Difficulty.Flyer),
            pose.Flow.CanStartFlow,
            pose.Flow.CanEndFlow,
            pose.Version.Value));
    }

    private static PoseSummaryResponse ToResponse(PublishedPoseSummary pose) =>
        new(
            pose.Id.Value,
            pose.Name.Value,
            DifficultyCodes.From(pose.BaseDifficulty),
            DifficultyCodes.From(pose.FlyerDifficulty),
            pose.Flow.CanStartFlow,
            pose.Flow.CanEndFlow);
}
