using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
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

    private static PoseSummaryResponse ToResponse(PublishedPoseSummary pose) =>
        new(pose.Id.Value, pose.Name.Value, ToCode(pose.BaseDifficulty), ToCode(pose.FlyerDifficulty));

    private static DifficultyCode ToCode(DifficultyLevel level) => level switch
    {
        DifficultyLevel.Discovery => DifficultyCode.Discovery,
        DifficultyLevel.Beginner => DifficultyCode.Beginner,
        DifficultyLevel.Intermediate => DifficultyCode.Intermediate,
        DifficultyLevel.Advanced => DifficultyCode.Advanced,
        _ => throw new ArgumentOutOfRangeException(nameof(level), level, "Unknown difficulty level."),
    };
}
