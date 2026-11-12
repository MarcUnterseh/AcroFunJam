using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>
/// What a contributor sees of one of their proposals (story 5, ADR 0023): the presented pose, its status for them, the
/// adjustments, the note or the reason, and never the validator who decided.
/// </summary>
public sealed class MyPoseProposalTests
{
    private static readonly DateTimeOffset Submitted = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Decided = Submitted.AddDays(2);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly ProposedPose Throne = AProposedPose.Named("Throne");

    private static PoseProposal APendingProposal() =>
        PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), Alice, Throne, NameAvailability.Available, Submitted).Value!;

    private static PoseProposal AnAcceptedProposal(PoseAdjustments adjustments, AdjustmentNote? note = null)
    {
        var proposal = APendingProposal();
        proposal.Accept(Bruno, Throne.Retain(adjustments), note, NameAvailability.Available, Decided).IsSuccess.ShouldBeTrue();
        return proposal;
    }

    private static readonly RejectionReason Duplicate = RejectionReason.Create("Doublon de Bird, déjà au catalogue.").Value!;

    private static PoseProposal ARejectedProposal()
    {
        var proposal = APendingProposal();
        proposal.Reject(Bruno, Duplicate, Decided).IsSuccess.ShouldBeTrue();
        return proposal;
    }

    private static PoseAdjustments Adjusting(string? name = null, string? flyerDifficulty = null) =>
        PoseAdjustments.Create(name, baseDifficulty: null, flyerDifficulty, canStartFlow: null, canEndFlow: null).Value!;

    [Fact]
    public void Of_Should_PresentTheProposedPoseAsPending_When_TheProposalIsPending()
    {
        var proposal = APendingProposal();

        var mine = MyPoseProposal.Of(proposal);

        mine.ShouldSatisfyAllConditions(
            () => mine.Id.ShouldBe(proposal.Id),
            () => mine.Status.ShouldBe(MyProposalStatus.Pending),
            () => mine.Name.ShouldBe(Throne.Name),
            () => mine.Difficulty.ShouldBe(Throne.Difficulty),
            () => mine.Flow.ShouldBe(Throne.Flow));
    }

    [Fact]
    public void Of_Should_PresentTheSubmissionDateAndNoDecisionDate_When_TheProposalIsPending()
    {
        var mine = MyPoseProposal.Of(APendingProposal());

        mine.ShouldSatisfyAllConditions(
            () => mine.SubmittedAt.ShouldBe(Submitted),
            () => mine.DecidedAt.ShouldBeNull());
    }

    [Fact]
    public void Of_Should_PresentTheRetainedPoseAsAccepted_When_AcceptedWithoutAdjustment()
    {
        var mine = MyPoseProposal.Of(AnAcceptedProposal(PoseAdjustments.None));

        mine.ShouldSatisfyAllConditions(
            () => mine.Status.ShouldBe(MyProposalStatus.Accepted),
            () => mine.Name.ShouldBe(Throne.Name),
            () => mine.Difficulty.ShouldBe(Throne.Difficulty),
            () => mine.Flow.ShouldBe(Throne.Flow));
    }

    [Fact]
    public void Of_Should_PresentNoAdjustment_When_AcceptedWithoutAdjustment()
    {
        var mine = MyPoseProposal.Of(AnAcceptedProposal(PoseAdjustments.None));

        mine.Adjustments.ShouldBeEmpty();
    }

    [Fact]
    public void Of_Should_PresentTheRetainedPoseAsAcceptedWithAdjustments_When_TheValidatorAdjustedIt()
    {
        var proposal = AnAcceptedProposal(Adjusting(name: "Throne Bird", flyerDifficulty: "intermediate"));

        var mine = MyPoseProposal.Of(proposal);

        mine.ShouldSatisfyAllConditions(
            () => mine.Status.ShouldBe(MyProposalStatus.AcceptedWithAdjustments),
            () => mine.Name.Value.ShouldBe("Throne Bird"),
            () => mine.Difficulty.Flyer.ShouldBe(DifficultyLevel.Intermediate));
    }

    [Fact]
    public void Of_Should_PresentTheAdjustedFieldsOnly_When_AcceptedWithAdjustments()
    {
        var mine = MyPoseProposal.Of(AnAcceptedProposal(Adjusting(flyerDifficulty: "intermediate")));

        mine.Adjustments.ShouldBe(
            [new FlyerDifficultyAdjustment(DifficultyLevel.Discovery, DifficultyLevel.Intermediate)]);
    }

    [Fact]
    public void Of_Should_PresentTheAdjustmentNote_When_AcceptedWithAdjustmentsAndANote()
    {
        var note = AdjustmentNote.Create("Throne se découvre dès la première séance côté flyer.").Value;

        var mine = MyPoseProposal.Of(AnAcceptedProposal(Adjusting(flyerDifficulty: "intermediate"), note));

        mine.Note.ShouldBe(note);
    }

    [Fact]
    public void Of_Should_PresentNoNote_When_AcceptedWithAdjustmentsWithoutNote()
    {
        var mine = MyPoseProposal.Of(AnAcceptedProposal(Adjusting(flyerDifficulty: "intermediate")));

        mine.Note.ShouldBeNull();
    }

    [Fact]
    public void Of_Should_PresentTheProposedPoseAndTheReasonAsRejected_When_Rejected()
    {
        var mine = MyPoseProposal.Of(ARejectedProposal());

        mine.ShouldSatisfyAllConditions(
            () => mine.Status.ShouldBe(MyProposalStatus.Rejected),
            () => mine.Name.ShouldBe(Throne.Name),
            () => mine.Reason.ShouldBe(Duplicate),
            () => mine.Adjustments.ShouldBeEmpty(),
            () => mine.Note.ShouldBeNull());
    }

    [Theory]
    [InlineData(MyProposalStatus.Accepted)]
    [InlineData(MyProposalStatus.AcceptedWithAdjustments)]
    [InlineData(MyProposalStatus.Rejected)]
    public void Of_Should_PresentTheDecisionDate_When_AcceptedOrRejected(MyProposalStatus decided)
    {
        var proposal = decided switch
        {
            MyProposalStatus.Accepted => AnAcceptedProposal(PoseAdjustments.None),
            MyProposalStatus.AcceptedWithAdjustments => AnAcceptedProposal(Adjusting(flyerDifficulty: "intermediate")),
            _ => ARejectedProposal(),
        };

        var mine = MyPoseProposal.Of(proposal);

        mine.ShouldSatisfyAllConditions(
            () => mine.Status.ShouldBe(decided),
            () => mine.DecidedAt.ShouldBe(Decided));
    }

    [Fact]
    public void Of_Should_PresentPublishedDirectlyWithoutDecisionDate_When_PublishedDirectly()
    {
        var bruno = new Contributor(new ContributorId(Bruno.Id.Value), IsValidator: true);
        var published = PoseProposal.Submit(new PoseProposalId(Guid.NewGuid()), bruno, Throne, NameAvailability.Available, Submitted).Value!;

        var mine = MyPoseProposal.Of(published);

        mine.ShouldSatisfyAllConditions(
            () => mine.Status.ShouldBe(MyProposalStatus.PublishedDirectly),
            () => mine.Name.ShouldBe(Throne.Name),
            () => mine.DecidedAt.ShouldBeNull(),
            () => mine.Adjustments.ShouldBeEmpty());
    }

    /// <summary>Story 4, R17: accepted by herself once promoted, even at the instant of the submission (frozen clock).</summary>
    [Fact]
    public void Of_Should_PresentAccepted_When_TheContributorPromotedSinceAcceptedTheirOwnProposal()
    {
        var proposal = APendingProposal();
        var alicePromoted = new Validator(Alice.Id.AsValidator(), CanDecide: true);
        proposal.Accept(alicePromoted, Throne.Retain(PoseAdjustments.None), note: null, NameAvailability.Available, Submitted)
            .IsSuccess.ShouldBeTrue();

        var mine = MyPoseProposal.Of(proposal);

        mine.ShouldSatisfyAllConditions(
            () => mine.Status.ShouldBe(MyProposalStatus.Accepted),
            () => mine.DecidedAt.ShouldBe(Submitted));
    }

    /// <summary>Q12: nothing designates the validator who decided, so nothing can leak it to the contributor.</summary>
    [Fact]
    public void MyPoseProposal_Should_ExposeNoValidator_When_Inspected()
    {
        var members = typeof(MyPoseProposal).GetProperties();

        members.ShouldNotContain(property =>
            property.PropertyType == typeof(ValidatorId) || property.PropertyType == typeof(ValidatorId?)
            || property.PropertyType == typeof(Validator) || property.PropertyType == typeof(ProposalDecision)
            || property.PropertyType.IsSubclassOf(typeof(ProposalDecision)));
    }
}
