using AcroFunJam.Application.Contribution.AcceptPoseProposal;
using AcroFunJam.Application.Contribution.GetPendingPoseProposalsCarryingTag;
using AcroFunJam.Application.Contribution.ProposePose;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>The tags of a proposed pose, chosen through the list of the Catalog for a pose (story 9a, E1 to E4, ADR 0036).</summary>
public sealed class PoseProposalTagsHandlersTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 18, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly Contributor Claire = new(new ContributorId(Guid.NewGuid()), IsValidator: true);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly ProposedPose FoldedLeaf = ProposedPose.Create("Folded Leaf", "beginner", "discovery", false, true).Value!;
    private static readonly TagId Lunar = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());
    private static readonly TagId Pop = new(Guid.NewGuid());

    private readonly FakePoseReservation _reservation = new();
    private FakePoseProposalRepository _proposals = new();
    private readonly FakeCatalogPublisher _publisher = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly FakeCatalogTags _tags = new(null, (Lunar, null), (Inversion, null), (Pop, null)) { PoseTags = { Lunar, Inversion } };

    private ProposePoseHandler Proposing(Contributor contributor) =>
        new(new FakeContributors(contributor), new FakeCatalogPoseNames(), _proposals, new FakePoseRevisionProposalRepository(), _publisher, _reservation,
            _unitOfWork, new FixedTimeProvider(Now), _tags);

    private AcceptPoseProposalHandler Accepting() =>
        new(new FakeValidators(Bruno), _proposals, new FakePoseRevisionProposalRepository(), new FakeCatalogPoseNames(), _reservation, _publisher,
            _unitOfWork, new FixedTimeProvider(Now), _tags);

    [Fact]
    public async Task ProposePose_Should_ProposeTheTagsChosenForAPose_When_TheyApplyToPoses()
    {
        var result = await Proposing(Alice).Handle(new ProposePose(Alice.Id, FoldedLeaf, [Lunar, Inversion]), Ct);

        result.Value!.Pose.Tags.ShouldBe(TagSet.Of([Lunar, Inversion]));
        _proposals.Added.ShouldHaveSingleItem().Pose.Tags.ShouldBe(TagSet.Of([Lunar, Inversion]));
    }

    [Fact]
    public async Task ProposePose_Should_RefuseATagThatDoesNotApplyToPoses_When_ItIsChosen()
    {
        var result = await Proposing(Alice).Handle(new ProposePose(Alice.Id, FoldedLeaf, [Pop]), Ct);

        result.Error.ShouldBeOfType<ProposedTagsNotApplicableError>().Tags.ShouldBe(TagSet.Of([Pop]));
        _proposals.Added.ShouldBeEmpty();
    }

    [Fact]
    public async Task ProposePose_Should_PublishThePoseWithItsTags_When_AValidatorProposes()
    {
        await Proposing(Claire).Handle(new ProposePose(Claire.Id, FoldedLeaf, [Inversion]), Ct);

        _publisher.Published.ShouldHaveSingleItem().Pose.Tags.ShouldBe(TagSet.Of([Inversion]));
    }

    [Fact]
    public async Task AcceptPoseProposal_Should_PublishTheRetainedTags_When_TheValidatorCorrectsThem()
    {
        var proposal = PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), Alice, FoldedLeaf, NameAvailability.Available, Now,
            new TagChoice(TagSet.Of([Lunar, Inversion]), TagSet.Empty)).Value!;
        _proposals = new FakePoseProposalRepository { Stored = [proposal] };

        var result = await Accepting().Handle(
            new AcceptPoseProposal(proposal.Id, Bruno.Id, PoseAdjustments.None, Note: null, Tags: [Lunar]), Ct);

        result.Value!.Adjusted.ShouldBeTrue();
        _publisher.Published.ShouldHaveSingleItem().Pose.Tags.ShouldBe(TagSet.Of([Lunar]));
    }

    [Fact]
    public async Task AcceptPoseProposal_Should_KeepTheProposedTags_When_NoneAreGiven()
    {
        var proposal = PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), Alice, FoldedLeaf, NameAvailability.Available, Now,
            new TagChoice(TagSet.Of([Lunar]), TagSet.Empty)).Value!;
        _proposals = new FakePoseProposalRepository { Stored = [proposal] };

        var result = await Accepting().Handle(new AcceptPoseProposal(proposal.Id, Bruno.Id, PoseAdjustments.None, Note: null), Ct);

        result.Value!.Adjusted.ShouldBeFalse();
        _publisher.Published.ShouldHaveSingleItem().Pose.Tags.ShouldBe(TagSet.Of([Lunar]));
    }

    // --- Carrying a tag (A4, A6) ---------------------------------------------------------------

    [Fact]
    public async Task GetPendingPoseProposalsCarryingTag_Should_ListOnlyThePendingProposalsCarryingTheTag_When_Asked()
    {
        var carrying = PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), Alice, FoldedLeaf, NameAvailability.Available, Now,
            new TagChoice(TagSet.Of([Lunar]), TagSet.Empty)).Value!;
        var throne = ProposedPose.Create("Throne", "beginner", "discovery", false, true).Value!;
        var other = PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), Alice, throne, NameAvailability.Available, Now,
            new TagChoice(TagSet.Of([Inversion]), TagSet.Empty)).Value!;

        var result = await new GetPendingPoseProposalsCarryingTagHandler(new FakePendingPoseProposalsReader(carrying, other))
            .Handle(new GetPendingPoseProposalsCarryingTag(Lunar), Ct);

        result.Value!.ShouldBe([carrying]);
    }
}
