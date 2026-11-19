using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>The tags of a pose revision: a field of the revision, changed, adjusted and kept (story 9a, Q172, ADR 0036).</summary>
public sealed class PoseRevisionTagsTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 19, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly TagId Lunar = new(Guid.NewGuid());
    private static readonly TagId Inversion = new(Guid.NewGuid());
    private static readonly TagId Pop = new(Guid.NewGuid());

    private static PublishedPose FoldedLeaf(params TagId[] tags) => new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create("Folded Leaf").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!) { Tags = TagSet.Of(tags) },
        new PublishedPoseVersion(1));

    private static TagChoice Chosen(params TagId[] tags) => new(TagSet.Of(tags), TagSet.Empty);

    private static PoseChanges NoChange => PoseChanges.Create(null, null, null, null, null).Value!;

    private static PoseChanges TagsTo(params TagId[] tags) => NoChange.Tagged(Chosen(tags));

    private static AcroFunJam.Domain.Common.Result<PoseRevisionProposal> Submitted(PublishedPose pose, PoseChanges changes) =>
        PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.NewGuid()), Alice, pose, pose.Version, changes, message: null, revisionAlreadyPending: false,
            NameAvailability.Available, Now);

    // --- Proposing ----------------------------------------------------------------------------

    [Fact]
    public void Submit_Should_ChangeTheTags_When_OnlyTheTagsChange()
    {
        var proposal = Submitted(FoldedLeaf(), TagsTo(Lunar)).Value!;

        proposal.Revision.After.Tags.ShouldBe(TagSet.Of([Lunar]));
        proposal.Revision.Changes.ShouldBe([new PoseTagsChange(TagSet.Empty, TagSet.Of([Lunar]))]);
    }

    [Fact]
    public void Submit_Should_KeepTheTagsOfThePose_When_TheyAreNotChanged()
    {
        var changed = Submitted(FoldedLeaf(Lunar), PoseChanges.Create(null, null, "beginner", null, null).Value!).Value!;

        changed.Revision.After.Tags.ShouldBe(TagSet.Of([Lunar]));
        changed.Revision.Changes.ShouldNotContain(c => c is PoseTagsChange);
    }

    [Fact]
    public void Submit_Should_RemoveEveryTag_When_NoneIsChosen() =>
        Submitted(FoldedLeaf(Inversion), TagsTo()).Value!.Revision.After.Tags.ShouldBe(TagSet.Empty);

    [Fact]
    public void Submit_Should_FailWithRevisionChangesNothing_When_TheSameTagsAreChosenInAnotherOrder() =>
        Submitted(FoldedLeaf(Lunar, Inversion), TagsTo(Inversion, Lunar)).Error.ShouldBe(ContributionErrors.RevisionChangesNothing);

    [Fact]
    public void Submit_Should_TellTheTagsThatDoNotApplyToPoses_When_SomeAreChosen() =>
        Submitted(FoldedLeaf(Lunar), NoChange.Tagged(new TagChoice(TagSet.Of([Lunar]), TagSet.Empty, TagSet.Of([Pop]))))
            .Error.ShouldBeOfType<ProposedTagsNotApplicableError>().Tags.ShouldBe(TagSet.Of([Pop]));

    [Fact]
    public void Submit_Should_TellTheTagsNotInTheList_When_SomeAreChosen()
    {
        var classique = new TagId(Guid.NewGuid());

        Submitted(FoldedLeaf(), NoChange.Tagged(new TagChoice(TagSet.Empty, TagSet.Of([classique]))))
            .Error.ShouldBeOfType<ProposedTagsNotInListError>().Tags.ShouldBe(TagSet.Of([classique]));
    }

    // --- Accepting ----------------------------------------------------------------------------

    [Fact]
    public void Accept_Should_RetainOtherTagsAsAnAdjustment_When_TheValidatorChoosesThem()
    {
        var proposal = Submitted(FoldedLeaf(), TagsTo(Lunar, Inversion)).Value!;

        var acceptance = proposal.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Now, Chosen(Lunar)).Value!;

        acceptance.Retained.Tags.ShouldBe(TagSet.Of([Lunar]));
        acceptance.Retained.AdjustmentsFrom(proposal.Revision.After)
            .ShouldBe([new PoseTagsAdjustment(TagSet.Of([Lunar, Inversion]), TagSet.Of([Lunar]))]);
    }

    [Fact]
    public void Accept_Should_TagARevisionThatDidNotChangeTheTags_When_TheValidatorChoosesSome()
    {
        var proposal = Submitted(FoldedLeaf(), PoseChanges.Create(null, null, "beginner", null, null).Value!).Value!;

        proposal.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Now, Chosen(Lunar))
            .Value!.Retained.Tags.ShouldBe(TagSet.Of([Lunar]));
    }

    [Fact]
    public void Accept_Should_RefuseAndStayPending_When_ARetainedTagDoesNotApplyToPoses()
    {
        var proposal = Submitted(FoldedLeaf(), TagsTo(Lunar)).Value!;

        proposal.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Now,
                new TagChoice(TagSet.Of([Lunar]), TagSet.Empty, TagSet.Of([Pop])))
            .Error.ShouldBeOfType<ProposedTagsNotApplicableError>();
        proposal.Decision.ShouldBeNull();
    }

    [Fact]
    public void Accept_Should_FailWithRetainedRevisionChangesNothing_When_TheRetainedTagsAreThoseOfThePose()
    {
        var proposal = Submitted(FoldedLeaf(Inversion), TagsTo(Lunar)).Value!;

        proposal.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Now, Chosen(Inversion))
            .Error.ShouldBe(ContributionErrors.RetainedRevisionChangesNothing);
    }

    // --- « Mes propositions » -----------------------------------------------------------------

    [Fact]
    public void MyPoseRevision_Should_PresentTheTagsChangeAndTheirAdjustment_When_AcceptedWithOtherTags()
    {
        var proposal = Submitted(FoldedLeaf(), TagsTo(Lunar, Inversion)).Value!;
        proposal.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Now, Chosen(Lunar));

        var mine = MyPoseRevision.Of(proposal);

        mine.Changes.ShouldBe([new PoseTagsChange(TagSet.Empty, TagSet.Of([Lunar]))]);
        mine.Adjustments.ShouldBe([new PoseTagsAdjustment(TagSet.Of([Lunar, Inversion]), TagSet.Of([Lunar]))]);
    }
}
