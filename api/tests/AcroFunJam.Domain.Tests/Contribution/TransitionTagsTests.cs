using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>The tags of a proposed transition, proposed and retained (story 8, E1 to E8, ADR 0033).</summary>
public sealed class TransitionTagsTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 17, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly Contributor Claire = new(new ContributorId(Guid.NewGuid()), IsValidator: true);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly TransitionPoses ThroneToBird = TransitionPoses.Create(Guid.NewGuid(), Guid.NewGuid()).Value!;
    private static readonly TagId Pop = new(Guid.NewGuid());
    private static readonly TagId Dynamic = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());
    private static readonly TagId Vrille = new(Guid.NewGuid());

    private static TagChoice Chosen(params TagId[] tags) => new(TagSet.Of(tags), TagSet.Empty);

    private static ProposedTransition PopToBird => ProposedTransition.Create("Pop to Bird", "intermediate", "intermediate", null).Value!;

    private static TransitionProposal Submitted(TagChoice tags, Contributor? by = null) =>
        TransitionProposal.Submit(
            new TransitionProposalId(Guid.NewGuid()), by ?? Alice, ThroneToBird, PopToBird, fromPosePublished: true, toPosePublished: true,
            TransitionSlotAvailability.Available, Now, tags).Value!;

    // --- Proposing (E1 to E4) -----------------------------------------------------------------

    [Fact]
    public void Submit_Should_ProposeTheChosenTags_When_TheyAreInTheList()
    {
        Submitted(Chosen(Pop, Dynamic, Inversion)).Proposed.Tags.ShouldBe(TagSet.Of([Pop, Dynamic, Inversion]));
    }

    [Fact]
    public void Submit_Should_ProposeNoTag_When_NoneIsChosen()
    {
        TransitionProposal.Submit(
                new TransitionProposalId(Guid.NewGuid()), Alice, ThroneToBird, PopToBird, fromPosePublished: true, toPosePublished: true,
                TransitionSlotAvailability.Available, Now)
            .Value!.Proposed.Tags.ShouldBe(TagSet.Empty);
    }

    [Fact]
    public void Submit_Should_FailWithTagNotInList_When_AChosenTagIsNotInTheList_AfterThePosesAndBeforeThePlace()
    {
        var classique = new TagId(Guid.NewGuid());
        var notInList = new TagChoice(TagSet.Empty, TagSet.Of([classique]));

        var error = TransitionProposal.Submit(
                new TransitionProposalId(Guid.NewGuid()), Alice, ThroneToBird, PopToBird, fromPosePublished: true, toPosePublished: true,
                TransitionSlotAvailability.TakenByPendingProposal, Now, notInList)
            .Error.ShouldBeOfType<ProposedTagsNotInListError>();

        error.Code.ShouldBe("contribution.tag-not-in-list");
        error.Tags.ShouldBe(TagSet.Of([classique]));
        TransitionProposal.Submit(
                new TransitionProposalId(Guid.NewGuid()), Alice, ThroneToBird, PopToBird, fromPosePublished: false, toPosePublished: true,
                TransitionSlotAvailability.Available, Now, notInList)
            .Error.ShouldBe(ContributionErrors.FromPoseNotFound);
    }

    [Fact]
    public void Submit_Should_PublishTheTagsDirectly_When_AValidatorProposes()
    {
        var published = (TransitionAcceptance)Submitted(Chosen(Pop, Dynamic), by: Claire).Decision!;

        published.Retained.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
        published.HasAdjustments.ShouldBeFalse();
    }

    // --- Accepting (E6, E7) -------------------------------------------------------------------

    private static TransitionAcceptance Accepted(TransitionProposal proposal, TagChoice? retained) =>
        proposal.Accept(Bruno, TransitionAdjustments.None, note: null, TransitionSlotAvailability.Available, Now, retained).Value!;

    [Fact]
    public void Accept_Should_RetainTheProposedTags_When_TheyAreNotAdjusted()
    {
        var acceptance = Accepted(Submitted(Chosen(Pop, Dynamic, Inversion)), retained: null);

        acceptance.Retained.Tags.ShouldBe(TagSet.Of([Pop, Dynamic, Inversion]));
        acceptance.HasAdjustments.ShouldBeFalse();
    }

    [Fact]
    public void Accept_Should_AdjustTheTags_When_TheRetainedSetDiffers()
    {
        var proposal = Submitted(Chosen(Pop, Dynamic, Inversion));

        var acceptance = Accepted(proposal, Chosen(Pop, Dynamic, Vrille));

        acceptance.Retained.Tags.ShouldBe(TagSet.Of([Pop, Dynamic, Vrille]));
        acceptance.HasAdjustments.ShouldBeTrue();
        acceptance.Retained.AdjustmentsFrom(proposal.Proposed).ShouldHaveSingleItem()
            .ShouldBe(new TransitionTagsAdjustment(TagSet.Of([Pop, Dynamic, Inversion]), TagSet.Of([Pop, Dynamic, Vrille])));
    }

    [Fact]
    public void Accept_Should_NotAdjustTheTags_When_TheSameSetIsRetainedInAnotherOrder()
    {
        var acceptance = Accepted(Submitted(Chosen(Pop, Dynamic, Inversion)), Chosen(Inversion, Pop, Dynamic));

        acceptance.HasAdjustments.ShouldBeFalse();
    }

    [Fact]
    public void Accept_Should_AdjustTheTags_When_TagsAreGivenToATransitionProposedWithout()
    {
        var acceptance = Accepted(Submitted(Chosen()), Chosen(Pop, Dynamic));

        acceptance.HasAdjustments.ShouldBeTrue();
        acceptance.Retained.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
    }

    [Fact]
    public void Accept_Should_FailWithTagNotInListAndStayPending_When_ARetainedTagIsNotInTheList()
    {
        var proposal = Submitted(Chosen(Pop, Dynamic));

        proposal.Accept(
                Bruno, TransitionAdjustments.None, note: null, TransitionSlotAvailability.Available, Now,
                new TagChoice(TagSet.Empty, TagSet.Of([new TagId(Guid.NewGuid())])))
            .Error.ShouldBeOfType<ProposedTagsNotInListError>();
        proposal.Status.ShouldBe(ProposalStatus.Pending);
    }

    [Fact]
    public void Restore_Should_KeepTheTags_When_ReadBackFromStorage()
    {
        ProposedTransition.Restore(PopToBird.Name, PopToBird.Difficulty, null, TagSet.Of([Pop])).Tags.ShouldBe(TagSet.Of([Pop]));
        RetainedTransition.Create("Pop to Bird", "intermediate", "intermediate", null, TagSet.Of([Pop])).Value!.Tags.ShouldBe(TagSet.Of([Pop]));
    }

    // --- « Mes propositions » (E8) ------------------------------------------------------------

    private static readonly PoseName Throne = PoseName.Create("Throne").Value!;
    private static readonly PoseName Bird = PoseName.Create("Bird").Value!;

    [Fact]
    public void MyTransitionProposal_Should_PresentTheProposedTags_When_Pending()
    {
        MyTransitionProposal.Of(Submitted(Chosen(Pop, Dynamic)), Throne, Bird).Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
    }

    [Fact]
    public void MyTransitionProposal_Should_PresentTheRetainedTagsAndTheirAdjustment_When_AcceptedWithOtherTags()
    {
        var proposal = Submitted(Chosen(Pop, Dynamic, Inversion));
        Accepted(proposal, Chosen(Pop, Dynamic));

        var mine = MyTransitionProposal.Of(proposal, Throne, Bird);

        mine.Tags.ShouldBe(TagSet.Of([Pop, Dynamic]));
        mine.Adjustments.ShouldHaveSingleItem()
            .ShouldBe(new TransitionTagsAdjustment(TagSet.Of([Pop, Dynamic, Inversion]), TagSet.Of([Pop, Dynamic])));
    }
}
