using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Application.Catalog.GetPublishedPoseNames;
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

    private static readonly PosePage Throne = new(
        new PoseId(Guid.NewGuid()),
        PoseName.Create("Throne").Value!,
        Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!,
        FlowBoundaries.Create(canStartFlow: true, canEndFlow: false).Value!,
        PoseVersion.Of(4),
        TransitionsFrom: [],
        TransitionsTo: [],
        new Dictionary<TagId, PresentedTag>());

    /// <summary>Fake of the Catalog query: the published poses.</summary>
    private sealed class FakeGetPosePage(params PosePage[] poses) : IQueryHandler<GetPosePage, PosePage>
    {
        public Task<Result<PosePage>> Handle(GetPosePage query, CancellationToken ct) =>
            Task.FromResult(poses.SingleOrDefault(p => p.Id == query.Id) is { } pose
                ? Result<PosePage>.Success(pose)
                : Result<PosePage>.Failure(CatalogErrors.PoseNotFound));
    }

    [Fact]
    public async Task Find_Should_TranslateThePoseAndItsVersion_When_ItIsPublished()
    {
        var poses = new CatalogPoses(new FakeGetPosePage(Throne), new FakeGetPublishedPoseNames());

        var found = await poses.Find(new PublishedPoseId(Throne.Id.Value), Ct);

        found.Value.ShouldBe(new PublishedPose(
            new PublishedPoseId(Throne.Id.Value), new PriorPose(Throne.Name, Throne.Difficulty, Throne.Flow), new PublishedPoseVersion(4)));
    }

    /// <summary>Fake of the Catalog query: the current names of the published poses (story 7).</summary>
    private sealed class FakeGetPublishedPoseNames(params PosePage[] poses)
        : IQueryHandler<GetPublishedPoseNames, IReadOnlyDictionary<PoseId, PoseName>>
    {
        public Error? Failure { get; init; }

        public Task<Result<IReadOnlyDictionary<PoseId, PoseName>>> Handle(GetPublishedPoseNames query, CancellationToken ct) =>
            Task.FromResult(Failure is not null
                ? Result<IReadOnlyDictionary<PoseId, PoseName>>.Failure(Failure)
                : Result<IReadOnlyDictionary<PoseId, PoseName>>.Success(
                    poses.Where(p => query.Ids.Contains(p.Id)).ToDictionary(p => p.Id, p => p.Name)));
    }

    [Fact]
    public async Task NamesOf_Should_TranslateTheNamesOfThePublishedPoses_When_SomeAreUnknown()
    {
        var poses = new CatalogPoses(new FakeGetPosePage(), new FakeGetPublishedPoseNames(Throne));
        var unknown = new PublishedPoseId(Guid.NewGuid());

        var names = await poses.NamesOf([new PublishedPoseId(Throne.Id.Value), unknown], Ct);

        names.Value.ShouldNotBeNull().ShouldBe(new Dictionary<PublishedPoseId, PoseName> { [new PublishedPoseId(Throne.Id.Value)] = Throne.Name });
    }

    [Fact]
    public async Task NamesOf_Should_ReturnTheFailureOfTheCatalog_When_ItFails()
    {
        var failure = new Error("catalog.unavailable", "Le catalogue ne répond pas.");
        var poses = new CatalogPoses(new FakeGetPosePage(), new FakeGetPublishedPoseNames { Failure = failure });

        (await poses.NamesOf([new PublishedPoseId(Throne.Id.Value)], Ct)).Error.ShouldBe(failure);
    }

    [Fact]
    public async Task Find_Should_FailWithPoseNotFound_When_TheCatalogDoesNotHaveThePose()
    {
        var poses = new CatalogPoses(new FakeGetPosePage(), new FakeGetPublishedPoseNames());

        var found = await poses.Find(new PublishedPoseId(Guid.NewGuid()), Ct);

        found.Error.ShouldBe(ContributionErrors.PoseNotFound);
    }
}
