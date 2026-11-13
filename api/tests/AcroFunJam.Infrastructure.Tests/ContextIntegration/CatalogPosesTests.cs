using AcroFunJam.Application.Catalog.GetPublishedPose;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.ContextIntegration;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

/// <summary>Anti-corruption layer Contribution → Catalog: a published pose with its version (story 6, ADR 0024).</summary>
public sealed class CatalogPosesTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly PublishedPoseDetails Throne = new(
        new PoseId(Guid.NewGuid()),
        PoseName.Create("Throne").Value!,
        Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!,
        FlowBoundaries.Create(canStartFlow: true, canEndFlow: false).Value!,
        PoseVersion.Of(4));

    /// <summary>Fake of the Catalog query: the published poses.</summary>
    private sealed class FakeGetPublishedPose(params PublishedPoseDetails[] poses) : IQueryHandler<GetPublishedPose, PublishedPoseDetails>
    {
        public Task<Result<PublishedPoseDetails>> Handle(GetPublishedPose query, CancellationToken ct) =>
            Task.FromResult(poses.SingleOrDefault(p => p.Id == query.Id) is { } pose
                ? Result<PublishedPoseDetails>.Success(pose)
                : Result<PublishedPoseDetails>.Failure(CatalogErrors.PoseNotFound));
    }

    [Fact]
    public async Task Find_Should_TranslateThePoseAndItsVersion_When_ItIsPublished()
    {
        var poses = new CatalogPoses(new FakeGetPublishedPose(Throne));

        var found = await poses.Find(new PublishedPoseId(Throne.Id.Value), Ct);

        found.Value.ShouldBe(new PublishedPose(
            new PublishedPoseId(Throne.Id.Value), new PriorPose(Throne.Name, Throne.Difficulty, Throne.Flow), new PublishedPoseVersion(4)));
    }

    [Fact]
    public async Task Find_Should_FailWithPoseNotFound_When_TheCatalogDoesNotHaveThePose()
    {
        var poses = new CatalogPoses(new FakeGetPublishedPose());

        var found = await poses.Find(new PublishedPoseId(Guid.NewGuid()), Ct);

        found.Error.ShouldBe(ContributionErrors.PoseNotFound);
    }
}
