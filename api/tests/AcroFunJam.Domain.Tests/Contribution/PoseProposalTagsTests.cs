using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>The tags of a proposed pose, proposed and retained (story 9a, E1 to E5, ADR 0036).</summary>
public sealed class PoseProposalTagsTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 18, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly Contributor Claire = new(new ContributorId(Guid.NewGuid()), IsValidator: true);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly TagId Lunar = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());
    private static readonly TagId Vrille = new(Guid.NewGuid());

    private static TagChoice Chosen(params TagId[] tags) => new(TagSet.Of(tags), TagSet.Empty);

    private static ProposedPose FoldedLeaf => ProposedPose.Create("Folded Leaf", "beginner", "discovery", false, true).Value!;

    private static PoseProposal Submitted(TagChoice? tags, Contributor? by = null) =>
        PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), by ?? Alice, FoldedLeaf, NameAvailability.Available, Now, tags).Value!;

    // --- Proposing (E1, E2) -------------------------------------------------------------------

    [Fact]
    public void Submit_Should_ProposeTheChosenTags_When_TheyApplyToPoses() =>
        Submitted(Chosen(Lunar, Inversion)).Pose.Tags.ShouldBe(TagSet.Of([Lunar, Inversion]));

    [Fact]
    public void Submit_Should_ProposeNoTag_When_NoneIsChosen() => Submitted(tags: null).Pose.Tags.ShouldBe(TagSet.Empty);

    [Fact]
    public void Submit_Should_TellTheTagsNotInTheListBeforeTheName_When_SomeAreChosen()
    {
        var classique = new TagId(Guid.NewGuid());

        PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), Alice, FoldedLeaf, NameAvailability.TakenByPendingProposal, Now,
                new TagChoice(TagSet.Empty, TagSet.Of([classique])))
            .Error.ShouldBeOfType<ProposedTagsNotInListError>().Tags.ShouldBe(TagSet.Of([classique]));
    }

    [Fact]
    public void Submit_Should_TellTheTagsThatDoNotApplyToPoses_When_SomeAreChosen()
    {
        var pop = new TagId(Guid.NewGuid());

        PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), Alice, FoldedLeaf, NameAvailability.Available, Now,
                new TagChoice(TagSet.Empty, TagSet.Empty, TagSet.Of([pop])))
            .Error.ShouldBeOfType<ProposedTagsNotApplicableError>().Tags.ShouldBe(TagSet.Of([pop]));
    }

    [Fact]
    public void Submit_Should_PublishDirectlyWithTheTags_When_AValidatorProposes()
    {
        var proposal = Submitted(Chosen(Inversion), Claire);

        proposal.Decision.ShouldBeOfType<Acceptance>().Retained.Tags.ShouldBe(TagSet.Of([Inversion]));
    }

    // --- Accepting (E4) -----------------------------------------------------------------------

    [Fact]
    public void Accept_Should_RetainTheProposedTags_When_NoneAreGiven()
    {
        var proposal = Submitted(Chosen(Lunar, Inversion));

        var acceptance = proposal.Accept(Bruno, proposal.Pose.Retain(PoseAdjustments.None), note: null, NameAvailability.Available, Now).Value!;

        acceptance.Retained.Tags.ShouldBe(TagSet.Of([Lunar, Inversion]));
        acceptance.HasAdjustments.ShouldBeFalse();
    }

    [Fact]
    public void Accept_Should_AdjustTheTags_When_OtherTagsAreRetained()
    {
        var proposal = Submitted(Chosen(Lunar, Inversion));

        var acceptance = proposal.Accept(Bruno, proposal.Pose.Retain(PoseAdjustments.None), note: null, NameAvailability.Available, Now,
            Chosen(Lunar)).Value!;

        acceptance.Retained.Tags.ShouldBe(TagSet.Of([Lunar]));
        acceptance.HasAdjustments.ShouldBeTrue();
        acceptance.Retained.AdjustmentsFrom(proposal.Pose)
            .ShouldBe([new PoseTagsAdjustment(TagSet.Of([Lunar, Inversion]), TagSet.Of([Lunar]))]);
    }

    [Fact]
    public void Accept_Should_FindNoAdjustment_When_TheSameTagsAreRetainedInAnotherOrder()
    {
        var proposal = Submitted(Chosen(Lunar, Inversion));

        proposal.Accept(Bruno, proposal.Pose.Retain(PoseAdjustments.None), note: null, NameAvailability.Available, Now, Chosen(Inversion, Lunar))
            .Value!.HasAdjustments.ShouldBeFalse();
    }

    [Fact]
    public void Accept_Should_RefuseAndStayPending_When_ARetainedTagDoesNotApplyToPoses()
    {
        var proposal = Submitted(Chosen(Lunar));

        proposal.Accept(Bruno, proposal.Pose.Retain(PoseAdjustments.None), note: null, NameAvailability.Available, Now,
                new TagChoice(TagSet.Of([Lunar]), TagSet.Empty, TagSet.Of([Vrille])))
            .Error.ShouldBeOfType<ProposedTagsNotApplicableError>();
        proposal.Decision.ShouldBeNull();
    }

    [Fact]
    public void Retain_Should_KeepTheProposedTags_When_NoOtherIsGiven() =>
        FoldedLeaf.Tagged(TagSet.Of([Lunar])).Retain(PoseAdjustments.None).Tags.ShouldBe(TagSet.Of([Lunar]));

    // --- « Mes propositions » (E5) -------------------------------------------------------------------

    [Fact]
    public void MyPoseProposal_Should_PresentTheProposedTags_When_ThePoseIsPending() =>
        MyPoseProposal.Of(Submitted(Chosen(Lunar))).Tags.ShouldBe(TagSet.Of([Lunar]));

    [Fact]
    public void MyPoseProposal_Should_PresentTheRetainedTagsAndTheirAdjustment_When_AcceptedWithOtherTags()
    {
        var proposal = Submitted(Chosen(Lunar, Inversion));
        proposal.Accept(Bruno, proposal.Pose.Retain(PoseAdjustments.None), note: null, NameAvailability.Available, Now, Chosen(Lunar));

        var mine = MyPoseProposal.Of(proposal);

        mine.Tags.ShouldBe(TagSet.Of([Lunar]));
        mine.Adjustments.ShouldBe([new PoseTagsAdjustment(TagSet.Of([Lunar, Inversion]), TagSet.Of([Lunar]))]);
    }
}
