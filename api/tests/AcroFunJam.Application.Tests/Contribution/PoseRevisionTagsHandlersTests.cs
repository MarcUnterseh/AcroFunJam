using AcroFunJam.Application.Catalog.RevisePose;
using AcroFunJam.Application.Contribution.AcceptPoseRevision;
using AcroFunJam.Application.Contribution.GetPendingPoseRevisionsCarryingTag;
using AcroFunJam.Application.Contribution.ProposePoseRevision;
using AcroFunJam.Application.Tests.Catalog;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>The tags of a pose revision, chosen through the list of the Catalog for a pose (story 9a, Q172, ADR 0036).</summary>
public sealed class PoseRevisionTagsHandlersTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 19, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly TagId Lunar = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());
    private static readonly TagId Pop = new(Guid.NewGuid());

    private static readonly PublishedPose FoldedLeaf = new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create("Folded Leaf").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
        new PublishedPoseVersion(1));

    private readonly FakePoseReservation _reservation = new();
    private readonly FakePoseRevisionProposalRepository _revisions = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly FakeCatalogPublisher _publisher = new();
    private readonly FakeCatalogTags _tags = new(null, (Lunar, null), (Inversion, null), (Pop, null)) { PoseTags = { Lunar, Inversion } };

    private ProposePoseRevisionHandler Proposing() =>
        new(new FakeContributors(Alice), new FakeCatalogPoses(FoldedLeaf), new FakeCatalogPoseNames(), new FakePoseProposalRepository(), _revisions,
            _reservation, _publisher, _unitOfWork, new FixedTimeProvider(Now), _tags);

    private AcceptPoseRevisionHandler Accepting() =>
        new(new FakeValidators(Bruno), _revisions, new FakeCatalogPoseNames(), new FakePoseProposalRepository(), _reservation, _publisher,
            _unitOfWork, new FixedTimeProvider(Now), _tags);

    private static PoseChanges NoChange => PoseChanges.Create(null, null, null, null, null).Value!;

    // --- Proposing ----------------------------------------------------------------------------

    [Fact]
    public async Task ProposePoseRevision_Should_ProposeTheTagsChosenForAPose_When_TheyApplyToPoses()
    {
        var result = await Proposing().Handle(new ProposePoseRevision(Alice.Id, FoldedLeaf.Id, FoldedLeaf.Version, NoChange) { Tags = [Lunar] }, Ct);

        result.Value!.Pose.Tags.ShouldBe(TagSet.Of([Lunar]));
        _revisions.Added.ShouldHaveSingleItem().Revision.After.Tags.ShouldBe(TagSet.Of([Lunar]));
    }

    [Fact]
    public async Task ProposePoseRevision_Should_RefuseAndSaveNothing_When_ATagDoesNotApplyToPoses()
    {
        var result = await Proposing().Handle(new ProposePoseRevision(Alice.Id, FoldedLeaf.Id, FoldedLeaf.Version, NoChange) { Tags = [Lunar, Pop] }, Ct);

        result.Error.ShouldBeOfType<ProposedTagsNotApplicableError>().Tags.ShouldBe(TagSet.Of([Pop]));
        _unitOfWork.Saves.ShouldBe(0);
    }

    // --- Accepting ----------------------------------------------------------------------------

    [Fact]
    public async Task AcceptPoseRevision_Should_ReviseThePoseWithTheRetainedTags_When_TheValidatorChoosesOthers()
    {
        var revision = PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.NewGuid()), Alice, FoldedLeaf, FoldedLeaf.Version, NoChange.Tagged(new TagChoice(TagSet.Of([Lunar, Inversion]), TagSet.Empty)),
            message: null, revisionAlreadyPending: false, NameAvailability.Available, Now).Value!;
        _revisions.Stored.Add(revision);

        var result = await Accepting().Handle(new AcceptPoseRevision(revision.Id, Bruno.Id, PoseAdjustments.None, Note: null) { Tags = [Lunar] }, Ct);

        result.Value!.HasAdjustments.ShouldBeTrue();
        _publisher.Revised.ShouldHaveSingleItem().Retained.Tags.ShouldBe(TagSet.Of([Lunar]));
    }

    // --- Revising in the Catalog --------------------------------------------------------------

    [Fact]
    public async Task RevisePose_Should_ReviseThePoseWithTheTagsChosenAgainForAPose_When_TheyApplyToPoses()
    {
        var (handler, poses, pose, lunar, _) = Revising();

        var result = await handler.Handle(Revision(pose) with { Tags = TagSet.Of([lunar]) }, Ct);

        result.IsSuccess.ShouldBeTrue();
        poses.Updated.ShouldHaveSingleItem().Tags.ShouldBe(TagSet.Of([lunar]));
    }

    [Fact]
    public async Task RevisePose_Should_RefuseATagThatDoesNotApplyToPoses_When_ItIsRetained()
    {
        var (handler, poses, pose, _, pop) = Revising();

        var result = await handler.Handle(Revision(pose) with { Tags = TagSet.Of([pop]) }, Ct);

        result.Error.ShouldBeOfType<TagNotApplicableError>();
        poses.Updated.ShouldBeEmpty();
    }

    private static (RevisePoseHandler Handler, FakePoseRepository Poses, Pose Pose, TagId Lunar, TagId Pop) Revising()
    {
        var lists = new FakeTagListRepository { Stored = TagList.Seed(InitialTagList.Current, () => new TagId(Guid.NewGuid()), Now) };
        var poses = new FakePoseRepository();
        var pose = Pose.Publish(
            new PoseId(Guid.NewGuid()), PoseName.Create("Folded Leaf").Value!, FoldedLeaf.Values.Difficulty, FoldedLeaf.Values.Flow, source: null,
            nameAlreadyPublished: false, Now).Value!;
        poses.Add(pose);
        return (new RevisePoseHandler(poses, new FakeUnitOfWork(), new FixedTimeProvider(Now), lists), poses, pose,
            lists.Stored.Tags.Single(t => t.Name.Value == "lunaire").Id, lists.Stored.Tags.Single(t => t.Name.Value == "pop").Id);
    }

    private static RevisePose Revision(Pose pose) =>
        new(pose.Id, pose.Name, pose.Difficulty, pose.Flow, pose.Version, new SourceProposalId(Guid.NewGuid()));

    // --- Carrying a tag (A6) ------------------------------------------------------------------

    [Fact]
    public async Task GetPendingPoseRevisionsCarryingTag_Should_ListOnlyThePendingRevisionsWhoseRevisedPoseCarriesTheTag_When_Asked()
    {
        PoseRevisionProposal Retagging(params TagId[] tags) => PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.NewGuid()), Alice, FoldedLeaf, FoldedLeaf.Version, NoChange.Tagged(new TagChoice(TagSet.Of(tags), TagSet.Empty)),
            message: null, revisionAlreadyPending: false, NameAvailability.Available, Now).Value!;
        var carrying = Retagging(Lunar);
        var other = Retagging(Inversion);

        var result = await new GetPendingPoseRevisionsCarryingTagHandler(new FakePendingPoseRevisionsReader(carrying, other))
            .Handle(new GetPendingPoseRevisionsCarryingTag(Lunar), Ct);

        result.Value!.ShouldBe([carrying]);
    }
}
