using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.GetPosePage;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Application.Catalog.TagPose;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>The tags of the published poses (story 9a, V1 to V5, D1 to D4, ADR 0036).</summary>
public sealed class PoseTagsHandlersTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 18, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly FakeTagListRepository _lists = new() { Stored = TagList.Seed(InitialTagList.Current, () => new TagId(Guid.NewGuid()), Now) };
    private readonly FakePoseRepository _poses = new();
    private readonly FakePendingPoseRevisions _pending = new();
    private readonly FakePoseTaggingLock _lock = new();
    private readonly FakeUnitOfWork _unitOfWork = new();

    private TagId IdOf(string name) => _lists.Stored!.Tags.Single(t => t.Name.Value == name).Id;

    private Pose FoldedLeaf(params string[] tags)
    {
        var pose = Pose.Publish(new PoseId(Guid.NewGuid()), PoseName.Create("Folded Leaf").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!, FlowBoundaries.Create(false, true).Value!,
            source: null, nameAlreadyPublished: false, Now, new TagChoice(TagSet.Of(tags.Select(IdOf)), TagSet.Empty)).Value!;
        _poses.Add(pose);
        return pose;
    }

    private TagPoseHandler TagHandler() => new(_poses, _lists, _pending, _lock, _unitOfWork, new FixedTimeProvider(Now));

    // --- Presenting (V1 to V4) ------------------------------------------------------------------

    [Fact]
    public async Task GetPosePage_Should_PresentTheTagsOfThePoseInCatalogOrder_When_ItCarriesSome()
    {
        var pose = FoldedLeaf("lunaire", "inversion");

        var page = (await new GetPosePageHandler(_poses, new FakePoseTransitionsReader(), _lists, _pending, new FakePosePhotosRepository(), new FakePhotoAddresses(), new FakeTransitionVideosRepository(), new FakeVideoAddresses()).Handle(new GetPosePage(pose.Id), Ct)).Value!;

        page.PoseTags.Select(t => t.Name.Value).ShouldBe(["inversion", "lunaire"]);
        page.PoseTags[0].Description.ShouldBe(_lists.Stored!.Tags.Single(t => t.Name.Value == "inversion").Description);
        page.HasPendingRevision.ShouldBeFalse();
    }

    [Fact]
    public async Task GetPosePage_Should_TellARevisionOfThePoseIsPending_When_ThereIsOne()
    {
        var pose = FoldedLeaf();
        _pending.Pending.Add(pose.Id);

        var page = (await new GetPosePageHandler(_poses, new FakePoseTransitionsReader(), _lists, _pending, new FakePosePhotosRepository(), new FakePhotoAddresses(), new FakeTransitionVideosRepository(), new FakeVideoAddresses()).Handle(new GetPosePage(pose.Id), Ct)).Value!;

        page.HasPendingRevision.ShouldBeTrue();
        page.PoseTags.ShouldBeEmpty();
    }

    [Fact]
    public async Task ListPublishedPoses_Should_PresentTheTagsOfEachPoseInCatalogOrder_When_TheyCarrySome()
    {
        var lunar = IdOf("lunaire");
        var inversion = IdOf("inversion");
        var reader = new FakePublishedPosesReader(
        [
            APublishedPose.Named("Straddle Bat").Build() with { Tags = TagSet.Of([lunar, inversion]) },
            APublishedPose.Named("Throne").Build(),
        ]);

        var poses = (await new ListPublishedPosesHandler(reader, _lists, new FakePosePhotosRepository(), new FakePhotoAddresses()).Handle(new ListPublishedPoses(), Ct)).Value!;

        poses.Select(p => (p.Pose.Name.Value, string.Join(", ", p.Tags.Select(t => t.Name.Value))))
            .ShouldBe([("Straddle Bat", "inversion, lunaire"), ("Throne", "")]);
    }

    // --- Tagging directly (D1 to D4) --------------------------------------------------------------

    [Fact]
    public async Task TagPose_Should_TagThePoseUnderItsLockAndSave_When_TheTagsApplyToPoses()
    {
        var pose = FoldedLeaf();

        var result = await TagHandler().Handle(new TagPose(pose.Id, [IdOf("lunaire")]), Ct);

        result.Value.ShouldBe(TagSet.Of([IdOf("lunaire")]));
        _poses.Updated.ShouldHaveSingleItem().ShouldBe(pose);
        _lock.Locked.ShouldBe([pose.Id]);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task TagPose_Should_SaveNothing_When_TheSameSetIsChosenInAnotherOrder()
    {
        var pose = FoldedLeaf("lunaire", "inversion");

        var result = await TagHandler().Handle(new TagPose(pose.Id, [IdOf("inversion"), IdOf("lunaire")]), Ct);

        result.IsSuccess.ShouldBeTrue();
        _poses.Updated.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task TagPose_Should_RefuseATagThatOnlyAppliesToTransitions_When_ItIsChosen()
    {
        var pose = FoldedLeaf();

        var result = await TagHandler().Handle(new TagPose(pose.Id, [IdOf("pop")]), Ct);

        result.Error.ShouldBeOfType<TagNotApplicableError>();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task TagPose_Should_FailWithPoseNotFound_When_ThePoseIsNotPublished() =>
        (await TagHandler().Handle(new TagPose(new PoseId(Guid.NewGuid()), [IdOf("lunaire")]), Ct)).Error.ShouldBe(CatalogErrors.PoseNotFound);

    [Fact]
    public async Task TagPose_Should_Refuse_When_ARevisionOfThePoseIsPending()
    {
        var pose = FoldedLeaf();
        _pending.Pending.Add(pose.Id);

        (await TagHandler().Handle(new TagPose(pose.Id, [IdOf("lunaire")]), Ct)).Error.ShouldBe(CatalogErrors.PoseRevisionPending);
        _unitOfWork.Saves.ShouldBe(0);
    }
}

/// <summary>In-memory fake of <see cref="IPendingPoseRevisions"/>: the poses having a pending revision.</summary>
internal sealed class FakePendingPoseRevisions : IPendingPoseRevisions
{
    public HashSet<PoseId> Pending { get; } = [];

    public Task<bool> IsPending(PoseId pose, CancellationToken ct) => Task.FromResult(Pending.Contains(pose));
}

/// <summary>Records the poses locked for a direct tagging, and runs the work.</summary>
internal sealed class FakePoseTaggingLock : IPoseTaggingLock
{
    public List<PoseId> Locked { get; } = [];

    public Task<Result<T>> Run<T>(PoseId pose, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        Locked.Add(pose);
        return work(ct);
    }
}
