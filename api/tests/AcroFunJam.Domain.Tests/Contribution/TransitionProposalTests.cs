using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>The transition proposal aggregate (story 7, ADR 0028).</summary>
public sealed class TransitionProposalTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly TransitionProposalId AnId = new(Guid.NewGuid());
    private static readonly TransitionPoses StarToStar = TransitionPoses.Create(Guid.NewGuid(), Guid.NewGuid()).Value!;
    private static readonly ProposedTransition NinjaStar = ProposedTransition.Create("Ninja Star", "advanced", "advanced", description: null).Value!;

    private static readonly ProposedTransition Unnamed = ProposedTransition.Create(name: null, "beginner", "beginner", description: null).Value!;

    private static Result<TransitionProposal> Submit(
        bool fromPosePublished = true, bool toPosePublished = true, ProposedTransition? proposed = null,
        TransitionSlotAvailability slot = TransitionSlotAvailability.Available, Contributor? by = null) =>
        TransitionProposal.Submit(AnId, by ?? Alice, StarToStar, proposed ?? NinjaStar, fromPosePublished, toPosePublished, slot, Now);

    [Fact]
    public void Slot_Should_BeThePlaceOfItsNameBetweenItsPoses_When_TheTransitionIsNamed()
    {
        Submit().Value!.Slot.ShouldBe(TransitionSlot.Of(StarToStar, NinjaStar.Name));
    }

    /// <summary>R9, R10: the error tells which place is taken, and where; the name is checked for everyone, validators included.</summary>
    [Theory]
    [InlineData(true, TransitionSlotAvailability.TakenByPublishedTransition, "contribution.transition-name-already-in-catalog")]
    [InlineData(true, TransitionSlotAvailability.TakenByPendingProposal, "contribution.transition-name-already-pending")]
    [InlineData(false, TransitionSlotAvailability.TakenByPublishedTransition, "contribution.unnamed-transition-already-in-catalog")]
    [InlineData(false, TransitionSlotAvailability.TakenByPendingProposal, "contribution.unnamed-transition-already-pending")]
    public void Submit_Should_FailWithoutEvent_When_ThePlaceOfTheTransitionIsTaken(bool named, TransitionSlotAvailability slot, string code)
    {
        foreach (var isValidator in new[] { false, true })
        {
            var result = Submit(proposed: named ? NinjaStar : Unnamed, slot: slot, by: Alice with { IsValidator = isValidator });

            result.Error!.Code.ShouldBe(code);
        }
    }

    /// <summary>R2: a validator's (or administrator's) transition is accepted at once by themselves, as proposed (ADR 0023).</summary>
    [Fact]
    public void Submit_Should_RecordADirectPublicationAndRaiseBothEvents_When_TheContributorIsAValidator()
    {
        var bruno = new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true);

        var proposal = Submit(by: bruno).Value!;

        proposal.Status.ShouldBe(ProposalStatus.Accepted);
        proposal.Decision.ShouldBe(TransitionAcceptance.DirectPublication(NinjaStar, bruno.Id, Now));
        proposal.Decision.ShouldBeOfType<TransitionAcceptance>().ShouldSatisfyAllConditions(
            a => a.IsDirectPublication.ShouldBeTrue(),
            a => a.Retained.ShouldBe(RetainedTransition.As(NinjaStar)),
            a => a.HasAdjustments.ShouldBeFalse(),
            a => a.Note.ShouldBeNull());
        proposal.DomainEvents.ShouldBe([
            new TransitionProposed(AnId, bruno.Id, StarToStar, NinjaStar.Name, Now),
            new TransitionProposalAccepted(AnId, bruno.Id.AsValidator(), WithAdjustments: false, Now)]);
    }

    [Fact]
    public void Rehydrate_Should_RestoreTheDirectPublication_When_ItIsTheOneItsSubmissionRecorded()
    {
        var proposal = TransitionProposal.Rehydrate(AnId, Alice.Id, StarToStar, NinjaStar, Now, TransitionAcceptance.DirectPublication(NinjaStar, Alice.Id, Now));

        proposal.Status.ShouldBe(ProposalStatus.Accepted);
    }

    [Theory]
    [InlineData("decider")]
    [InlineData("instant")]
    [InlineData("transition")]
    public void Rehydrate_Should_ReportABug_When_TheDirectPublicationIsIncoherent(string differing)
    {
        var published = differing switch
        {
            "decider" => TransitionAcceptance.DirectPublication(NinjaStar, new ContributorId(Guid.NewGuid()), Now),
            "instant" => TransitionAcceptance.DirectPublication(NinjaStar, Alice.Id, Now.AddDays(1)),
            _ => TransitionAcceptance.DirectPublication(Unnamed, Alice.Id, Now),
        };

        Should.Throw<InvalidOperationException>(() => TransitionProposal.Rehydrate(AnId, Alice.Id, StarToStar, NinjaStar, Now, published));
    }

    /// <summary>The poses are checked before the place: an unknown pose has no place to take.</summary>
    [Fact]
    public void Submit_Should_FailWithToPoseNotFound_When_ThePoseIsUnknownAndThePlaceTaken()
    {
        Submit(toPosePublished: false, slot: TransitionSlotAvailability.TakenByPendingProposal).Error.ShouldBe(ContributionErrors.ToPoseNotFound);
    }

    [Fact]
    public void Submit_Should_BePendingAndRaiseTransitionProposed_When_TheContributorIsNotAValidator()
    {
        var proposal = Submit().Value!;

        proposal.ShouldSatisfyAllConditions(
            p => p.Id.ShouldBe(AnId),
            p => p.Contributor.ShouldBe(Alice.Id),
            p => p.Poses.ShouldBe(StarToStar),
            p => p.Proposed.ShouldBe(NinjaStar),
            p => p.SubmittedAt.ShouldBe(Now),
            p => p.Decision.ShouldBeNull(),
            p => p.Status.ShouldBe(ProposalStatus.Pending));
        proposal.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TransitionProposed(AnId, Alice.Id, StarToStar, NinjaStar.Name, Now));
    }

    /// <summary>R4: both poses must be published; the start pose is checked first.</summary>
    [Fact]
    public void Submit_Should_FailWithFromPoseNotFound_When_TheStartPoseIsNotPublished()
    {
        Submit(fromPosePublished: false, toPosePublished: false).Error.ShouldBe(ContributionErrors.FromPoseNotFound);
    }

    [Fact]
    public void Submit_Should_FailWithToPoseNotFound_When_TheEndPoseIsNotPublished()
    {
        Submit(toPosePublished: false).Error.ShouldBe(ContributionErrors.ToPoseNotFound);
    }

    [Fact]
    public void Rehydrate_Should_RestoreThePendingProposalWithoutEvent_When_ItHasNoDecision()
    {
        var proposal = TransitionProposal.Rehydrate(AnId, Alice.Id, StarToStar, NinjaStar, Now);

        proposal.Status.ShouldBe(ProposalStatus.Pending);
        proposal.DomainEvents.ShouldBeEmpty();
    }
}
