using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>In-memory fake of <see cref="IPoseRepository"/>.</summary>
internal sealed class FakePoseRepository(params string[] publishedNames) : IPoseRepository
{
    public List<Pose> Added { get; } = [];

    public void Add(Pose pose) => Added.Add(pose);

    public Task<Pose?> GetById(PoseId id, CancellationToken ct) => Task.FromResult(Added.SingleOrDefault(p => p.Id == id));

    public List<Pose> Updated { get; } = [];

    public void Update(Pose pose) => Updated.Add(pose);

    public Task<bool> IsNameTaken(PoseNameKey key, CancellationToken ct) =>
        Task.FromResult(publishedNames.Any(n => PoseName.Create(n).Value!.Key == key) || Added.Any(p => p.Name.Key == key));

    public Task<IReadOnlyDictionary<PoseId, PoseName>> NamesOf(IReadOnlyCollection<PoseId> ids, CancellationToken ct) =>
        Task.FromResult<IReadOnlyDictionary<PoseId, PoseName>>(Added.Where(p => ids.Contains(p.Id)).ToDictionary(p => p.Id, p => p.Name));
}

public sealed class PublishPoseHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static PublishPose Publishing(string name, SourceProposalId? source = null) => new(
        PoseName.Create(name).Value!,
        Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!,
        FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!,
        source);

    [Fact]
    public async Task Handle_Should_AddAndSaveThePose_When_TheNameIsFree()
    {
        var poses = new FakePoseRepository("Bird");
        var unitOfWork = new FakeUnitOfWork();
        var source = new SourceProposalId(Guid.NewGuid());

        var result = await new PublishPoseHandler(poses, unitOfWork, new FixedTimeProvider(Now), new FakeTagListRepository()).Handle(Publishing("Throne", source), Ct);

        result.IsSuccess.ShouldBeTrue();
        var added = poses.Added.ShouldHaveSingleItem();
        added.Id.ShouldBe(result.Value);
        added.Name.Value.ShouldBe("Throne");
        added.SourceProposalId.ShouldBe(source);
        added.PublishedAt.ShouldBe(Now);
        unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_ReturnTheSaveError_When_TheDatabaseRejectsTheName()
    {
        // A concurrent publication of the same name, outside any reservation: the unique index decides (ADR 0017).
        var unitOfWork = new FakeUnitOfWork(CatalogErrors.PoseNameTaken);

        var result = await new PublishPoseHandler(new FakePoseRepository(), unitOfWork, new FixedTimeProvider(Now), new FakeTagListRepository()).Handle(Publishing("Throne"), Ct);

        result.Error.ShouldBe(CatalogErrors.PoseNameTaken);
    }

    [Fact]
    public async Task Handle_Should_FailAndSaveNothing_When_APublishedPoseHasTheName()
    {
        var poses = new FakePoseRepository("High Bird");
        var unitOfWork = new FakeUnitOfWork();

        var result = await new PublishPoseHandler(poses, unitOfWork, new FixedTimeProvider(Now), new FakeTagListRepository()).Handle(Publishing("high bird"), Ct);

        result.Error.ShouldBe(CatalogErrors.PoseNameTaken);
        poses.Added.ShouldBeEmpty();
        unitOfWork.Saves.ShouldBe(0);
    }

    // --- Story 9a: the tags of a published pose, chosen again by the list (ADR 0036) ------------------

    [Fact]
    public async Task Handle_Should_PublishThePoseWithTheTagsThatApplyToPoses_When_SomeAreGiven()
    {
        var lists = new FakeTagListRepository { Stored = TagList.Seed(InitialTagList.Current, () => new TagId(Guid.NewGuid()), Now) };
        var lunar = lists.Stored.Tags.Single(t => t.Name.Value == "lunaire").Id;
        var poses = new FakePoseRepository();

        var result = await new PublishPoseHandler(poses, new FakeUnitOfWork(), new FixedTimeProvider(Now), lists)
            .Handle(Publishing("Folded Leaf") with { Tags = TagSet.Of([lunar]) }, Ct);

        result.IsSuccess.ShouldBeTrue();
        poses.Added.ShouldHaveSingleItem().Tags.ShouldBe(TagSet.Of([lunar]));
    }

    [Fact]
    public async Task Handle_Should_RefuseATagThatDoesNotApplyToPoses_When_ItIsGiven()
    {
        var lists = new FakeTagListRepository { Stored = TagList.Seed(InitialTagList.Current, () => new TagId(Guid.NewGuid()), Now) };
        var pop = lists.Stored.Tags.Single(t => t.Name.Value == "pop").Id;
        var poses = new FakePoseRepository();

        var result = await new PublishPoseHandler(poses, new FakeUnitOfWork(), new FixedTimeProvider(Now), lists)
            .Handle(Publishing("Folded Leaf") with { Tags = TagSet.Of([pop]) }, Ct);

        result.Error.ShouldBeOfType<TagNotApplicableError>();
        poses.Added.ShouldBeEmpty();
    }
}
