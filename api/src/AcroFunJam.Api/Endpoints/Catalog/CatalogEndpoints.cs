using AcroFunJam.Application.Catalog.GetPosePage;
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

        catalog.MapTagEndpoints();

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

    /// <summary>
    /// The page of a published pose (story 7, ADR 0030): the pose with its version, to start a revision of it (story 6, ADR 0024),
    /// and its transitions from and to it, in the order of the domain.
    /// </summary>
    private static async Task<Results<Ok<PublishedPoseResponse>, ProblemHttpResult>> GetPublishedPose(
        Guid id,
        IQueryHandler<GetPosePage, PosePage> handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(new GetPosePage(new PoseId(id)), ct);
        if (result.IsFailure) return result.Error!.ToProblem();

        var pose = result.Value!;
        return TypedResults.Ok(new PublishedPoseResponse(
            pose.Id.Value,
            pose.Name.Value,
            DifficultyCodes.From(pose.Difficulty.Base),
            DifficultyCodes.From(pose.Difficulty.Flyer),
            pose.Flow.CanStartFlow,
            pose.Flow.CanEndFlow,
            pose.Version.Value,
            [.. pose.TransitionsFrom.Select(t => ToResponse(pose, t))],
            [.. pose.TransitionsTo.Select(t => ToResponse(pose, t))]));
    }

    private static LinkedTransitionResponse ToResponse(PosePage page, LinkedTransition transition) =>
        new(
            transition.Id.Value,
            new OtherPoseResponse(transition.OtherPose.Value, transition.OtherPoseName.Value),
            transition.Name?.Value,
            DifficultyCodes.From(transition.Difficulty.Base),
            DifficultyCodes.From(transition.Difficulty.Flyer),
            transition.Description?.Value,
            [.. page.TagsOf(transition).Select(t => new TransitionTagResponse(t.Id.Value, t.Name.Value, t.Description.Value))]);

    private static PoseSummaryResponse ToResponse(PublishedPoseSummary pose) =>
        new(
            pose.Id.Value,
            pose.Name.Value,
            DifficultyCodes.From(pose.BaseDifficulty),
            DifficultyCodes.From(pose.FlyerDifficulty),
            pose.Flow.CanStartFlow,
            pose.Flow.CanEndFlow);
}
