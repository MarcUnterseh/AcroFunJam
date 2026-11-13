using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>Deciding on a transition proposal: adjustments, acceptance, rejection (story 7, R14 to R20, ADR 0028).</summary>
public sealed class TransitionDecisionTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = Now.AddDays(2);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly TransitionPoses StarToStar = TransitionPoses.Create(Guid.NewGuid(), Guid.NewGuid()).Value!;

    private static ProposedTransition Proposed(string? name = "ninja star", string flyer = "intermediate", string? description = "Vidéo.") =>
        ProposedTransition.Create(name, "advanced", flyer, description).Value!;

    private static TransitionAdjustments Adjusting(string? name = null, string? flyer = null, string? description = null) =>
        TransitionAdjustments.Create(name, baseDifficulty: null, flyer, description).Value!;

    private static TransitionProposal APending(ProposedTransition? proposed = null) =>
        TransitionProposal.Rehydrate(new TransitionProposalId(Guid.NewGuid()), Alice.Id, StarToStar, proposed ?? Proposed(), Now);

    // --- Adjustments --------------------------------------------------------------------------

    [Fact]
    public void Retain_Should_KeepEveryValue_When_NothingIsAdjusted()
    {
        Proposed().Retain(TransitionAdjustments.None).ShouldBe(RetainedTransition.As(Proposed()));
    }

    [Fact]
    public void Retain_Should_ReplaceTheAdjustedValues_When_TheValidatorCorrectsThem()
    {
        var retained = Proposed().Retain(Adjusting(name: "Ninja Star", flyer: "advanced", description: "Rotation complète."));

        retained.ShouldSatisfyAllConditions(
            r => r.Name!.Value.ShouldBe("Ninja Star"),
            r => r.Difficulty.ShouldBe(Difficulty.Create(DifficultyLevel.Advanced, DifficultyLevel.Advanced).Value),
            r => r.Description!.Value.ShouldBe("Rotation complète."));
    }

    /// <summary>A blank name or description removes it (ADR 0030): « en retirant le nom ».</summary>
    [Fact]
    public void Retain_Should_RemoveTheNameAndTheDescription_When_TheyAreAdjustedToBlank()
    {
        var retained = Proposed().Retain(Adjusting(name: "", description: "   "));

        retained.Name.ShouldBeNull();
        retained.Description.ShouldBeNull();
    }

    [Theory]
    [InlineData("---", null, "transition.name-without-letter-or-digit")]
    [InlineData(null, "expert", "pose.unknown-difficulty-level")]
    public void Create_Should_FollowTheContentRules_When_AnAdjustedValueIsInvalid(string? name, string? flyer, string code)
    {
        TransitionAdjustments.Create(name, baseDifficulty: null, flyer, description: null).Error!.Code.ShouldBe(code);
    }

    [Fact]
    public void Create_Should_FailWithDescriptionTooLong_When_TheAdjustedDescriptionIsTooLong()
    {
        TransitionAdjustments.Create(null, null, null, new string('x', TransitionDescription.MaxLength + 1)).Error
            .ShouldBe(TransitionContentErrors.DescriptionTooLong);
    }

    /// <summary>R16: compared once normalised; a change of case of the name is an adjustment.</summary>
    [Fact]
    public void AdjustmentsFrom_Should_ListTheChangedFieldsOnly_When_SomeValuesDiffer()
    {
        var proposed = Proposed();

        var adjustments = proposed.Retain(Adjusting(name: "Ninja Star", flyer: "intermediate", description: "Rotation.")).AdjustmentsFrom(proposed);

        IReadOnlyList<TransitionFieldAdjustment> expected =
        [
            new TransitionNameAdjustment(proposed.Name, TransitionName.CreateOptional("Ninja Star").Value),
            new TransitionDescriptionAdjustment(proposed.Description, TransitionDescription.CreateOptional("Rotation.").Value),
        ];
        adjustments.ShouldBe(expected);
    }

    [Fact]
    public void AdjustmentsFrom_Should_FindNone_When_TheCorrectionDiffersOnlyBySuperfluousSpaces()
    {
        var proposed = Proposed();

        proposed.Retain(Adjusting(name: "  ninja   star ")).AdjustmentsFrom(proposed).ShouldBeEmpty();
    }

    [Fact]
    public void AdjustmentsFrom_Should_ListTheName_When_TheValidatorNamesAnUnnamedTransition()
    {
        var unnamed = Proposed(name: null);

        unnamed.Retain(Adjusting(name: "Ninja Star")).AdjustmentsFrom(unnamed)
            .ShouldBe([new TransitionNameAdjustment(null, TransitionName.CreateOptional("Ninja Star").Value)]);
    }

    [Fact]
    public void AdjustmentsFrom_Should_ListTheFlyerDifficulty_When_ItIsCorrected()
    {
        var proposed = Proposed();

        proposed.Retain(Adjusting(flyer: "advanced")).AdjustmentsFrom(proposed)
            .ShouldBe([new TransitionFlyerDifficultyAdjustment(DifficultyLevel.Intermediate, DifficultyLevel.Advanced)]);
    }

    // --- Acceptance ---------------------------------------------------------------------------

    [Fact]
    public void Accept_Should_RecordTheRetainedTransitionAndRaiseTheEvent_When_AValidatorAcceptsWithAdjustments()
    {
        var proposal = APending();

        var accepted = proposal.Accept(Bruno, Adjusting(flyer: "advanced"), note: null, TransitionSlotAvailability.Available, Later);

        var acceptance = accepted.Value!;
        acceptance.ShouldSatisfyAllConditions(
            a => a.By.ShouldBe(Bruno.Id),
            a => a.At.ShouldBe(Later),
            a => a.HasAdjustments.ShouldBeTrue(),
            a => a.IsDirectPublication.ShouldBeFalse(),
            a => a.Retained.Difficulty.Flyer.ShouldBe(DifficultyLevel.Advanced));
        proposal.Status.ShouldBe(ProposalStatus.Accepted);
        proposal.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TransitionProposalAccepted(proposal.Id, Bruno.Id, WithAdjustments: true, Later));
    }

    [Fact]
    public void Accept_Should_FailWithValidatorRequired_When_TheDeciderMayNotDecide()
    {
        APending().Accept(Bruno with { CanDecide = false }, TransitionAdjustments.None, null, TransitionSlotAvailability.Available, Later).Error
            .ShouldBe(ContributionErrors.ValidatorRequired);
    }

    [Fact]
    public void Accept_Should_FailWithProposalAlreadyDecided_When_TheProposalWasRejected()
    {
        var proposal = APending();
        proposal.Reject(Bruno, RejectionReason.Create("Doublon.").Value!, Now);

        proposal.Accept(Bruno, TransitionAdjustments.None, null, TransitionSlotAvailability.Available, Later).Error
            .ShouldBe(ContributionErrors.ProposalAlreadyDecided);
    }

    [Fact]
    public void Accept_Should_FailWithAdjustmentNoteWithoutAdjustment_When_ANoteComesWithoutAdjustment()
    {
        APending().Accept(Bruno, TransitionAdjustments.None, AdjustmentNote.Create("Merci.").Value, TransitionSlotAvailability.Available, Later).Error
            .ShouldBe(ContributionErrors.AdjustmentNoteWithoutAdjustment);
    }

    /// <summary>R17, R18: the place of the retained transition, its name or the unnamed one, taken in the catalog.</summary>
    [Theory]
    [InlineData("Ninja Star", "contribution.transition-name-already-in-catalog")]
    [InlineData("", "contribution.unnamed-transition-already-in-catalog")]
    public void Accept_Should_FailWithoutDecision_When_ThePlaceOfTheRetainedTransitionIsTaken(string retainedName, string code)
    {
        var proposal = APending();

        var accepted = proposal.Accept(Bruno, Adjusting(name: retainedName), null, TransitionSlotAvailability.TakenByPublishedTransition, Later);

        accepted.Error!.Code.ShouldBe(code);
        proposal.Status.ShouldBe(ProposalStatus.Pending);
        proposal.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void SlotIfAccepted_Should_BeThePlaceOfTheRetainedName_When_TheNameIsAdjusted()
    {
        var proposal = APending(Proposed(name: null));

        proposal.SlotIfAccepted(Adjusting(name: "Ninja Star")).ShouldBe(TransitionSlot.Of(StarToStar, TransitionName.CreateOptional("Ninja Star").Value));
        proposal.SlotIfAccepted(TransitionAdjustments.None).ShouldBe(TransitionSlot.Of(StarToStar, name: null));
    }

    // --- Rejection ----------------------------------------------------------------------------

    [Fact]
    public void Reject_Should_RecordTheReasonAndRaiseTheEvent_When_AValidatorRejects()
    {
        var proposal = APending();
        var reason = RejectionReason.Create("Cette transition arrive en Bird, pas en Star : propose-la vers Bird.").Value!;

        var rejection = proposal.Reject(Bruno, reason, Later).Value!;

        rejection.ShouldBe(new Rejection(Bruno.Id, Later, reason));
        proposal.Status.ShouldBe(ProposalStatus.Rejected);
        proposal.DomainEvents.ShouldHaveSingleItem().ShouldBe(new TransitionProposalRejected(proposal.Id, Bruno.Id, reason, Later));
    }

    [Fact]
    public void Reject_Should_FailWithProposalAlreadyDecided_When_TheProposalWasAccepted()
    {
        var proposal = APending();
        proposal.Accept(Bruno, TransitionAdjustments.None, null, TransitionSlotAvailability.Available, Now);

        proposal.Reject(Bruno, RejectionReason.Create("Doublon.").Value!, Later).Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
    }

    // --- Stored acceptance --------------------------------------------------------------------

    [Fact]
    public void Restore_Should_RebuildTheAcceptance_When_ReadBackFromStorage()
    {
        var proposed = Proposed();
        var retained = proposed.Retain(Adjusting(flyer: "advanced"));

        var restored = TransitionAcceptance.Restore(proposed, retained, AdjustmentNote.Create("La base porte tout.").Value, Bruno.Id, Later, isDirectPublication: false);

        restored.Value!.ShouldSatisfyAllConditions(a => a.HasAdjustments.ShouldBeTrue(), a => a.Note!.Value.ShouldBe("La base porte tout."));
    }

    // --- Validation queue ---------------------------------------------------------------------

    [Fact]
    public void PendingTransitionProposal_Should_BeKnownByItsStartPose_When_QueuedWithTheCurrentNames()
    {
        var proposal = APending();
        var star = PoseName.Create("Star").Value!;

        var pending = PendingTransitionProposal.Of(proposal, star, star);

        pending.ShouldSatisfyAllConditions(
            p => p.QueuedName.ShouldBe(star),
            p => p.SubmittedAt.ShouldBe(Now),
            p => p.Proposal.ShouldBe(proposal),
            p => p.FromPoseName.ShouldBe(star),
            p => p.ToPoseName.ShouldBe(star));
    }
}
