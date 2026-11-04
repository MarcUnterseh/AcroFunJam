using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

public sealed class PoseProposalTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);

    private static readonly PoseProposalId AnId = new(Guid.NewGuid());

    private static readonly DateTimeOffset Later = Now.AddDays(1);
    private static readonly Validator Claire = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly RejectionReason Duplicate = RejectionReason.Create("Doublon de Bird, déjà au catalogue.").Value!;

    private static readonly ProposedPose Throne = AProposedPose.Named("Throne");

    private static PoseProposal APendingProposal() => PoseProposal.Rehydrate(AnId, Alice.Id, Throne, Now);

    /// <summary>Accepts the proposal as proposed: the retained pose is the proposed pose, without note.</summary>
    private static Result<Acceptance> AcceptAsProposed(PoseProposal proposal, Validator by, DateTimeOffset now) =>
        proposal.Accept(by, proposal.Pose.Retain(PoseAdjustments.None), note: null, NameAvailability.Available, now);

    private static Acceptance AnAcceptanceAsProposed(ValidatorId by, DateTimeOffset at) =>
        Acceptance.Of(Throne, Throne.Retain(PoseAdjustments.None), note: null, by, at).Value!;

    private static PoseAdjustments Adjusting(string? name = null, string? flyerDifficulty = null, bool? canEndFlow = null) =>
        PoseAdjustments.Create(name, baseDifficulty: null, flyerDifficulty, canStartFlow: null, canEndFlow).Value!;

    private static PoseProposal ADirectPublication() =>
        PoseProposal.Submit(
            AnId, new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true), AProposedPose.Named("Throne"),
            NameAvailability.Available, Now).Value!;

    [Fact]
    public void Submit_Should_BePendingAndRaisePoseProposed_When_TheContributorIsNotAValidator()
    {
        var throne = AProposedPose.Named("Throne");

        var proposal = PoseProposal.Submit(AnId, Alice, throne, NameAvailability.Available, Now);

        proposal.IsSuccess.ShouldBeTrue();
        var pending = proposal.Value!;
        pending.Id.ShouldBe(AnId);
        pending.Contributor.ShouldBe(Alice.Id);
        pending.Pose.ShouldBe(throne);
        pending.Status.ShouldBe(ProposalStatus.Pending);
        pending.SubmittedAt.ShouldBe(Now);
        pending.Decision.ShouldBeNull();
        pending.DomainEvents.ShouldHaveSingleItem().ShouldBe(new PoseProposed(AnId, Alice.Id, throne.Name, Now));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Submit_Should_FailWithoutEvent_When_APublishedPoseHasTheName(bool isValidator)
    {
        var contributor = new Contributor(new ContributorId(Guid.NewGuid()), isValidator);

        var proposal = PoseProposal.Submit(AnId, contributor, AProposedPose.Named("high bird"), NameAvailability.TakenByPublishedPose, Now);

        proposal.Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Submit_Should_FailWithoutEvent_When_APendingProposalHasTheName(bool isValidator)
    {
        var contributor = new Contributor(new ContributorId(Guid.NewGuid()), isValidator);

        var proposal = PoseProposal.Submit(AnId, contributor, AProposedPose.Named("throne"), NameAvailability.TakenByPendingProposal, Now);

        proposal.Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
    }

    [Theory]
    [InlineData(false, false, NameAvailability.Available)]
    [InlineData(true, false, NameAvailability.TakenByPublishedPose)]
    [InlineData(false, true, NameAvailability.TakenByPendingProposal)]
    [InlineData(true, true, NameAvailability.TakenByPublishedPose)]
    public void From_Should_PreferTheCatalog_When_TheNameIsTakenBothWays(bool published, bool pending, NameAvailability expected)
    {
        NameAvailability.From(published, pending).ShouldBe(expected);
    }

    [Fact]
    public void Rehydrate_Should_RestoreThePendingProposalWithoutEvents_When_LoadedFromStorage()
    {
        var throne = AProposedPose.Named("Throne");

        var pending = PoseProposal.Rehydrate(AnId, Alice.Id, throne, Now);

        pending.ShouldSatisfyAllConditions(
            () => pending.Id.ShouldBe(AnId),
            () => pending.Contributor.ShouldBe(Alice.Id),
            () => pending.Pose.ShouldBe(throne),
            () => pending.SubmittedAt.ShouldBe(Now),
            () => pending.Status.ShouldBe(ProposalStatus.Pending),
            () => pending.DomainEvents.ShouldBeEmpty());
    }

    [Fact]
    public void Rehydrate_Should_RestoreTheDecisionWithoutEvents_When_TheProposalWasDecided()
    {
        var rejection = new Rejection(Claire.Id, Later, Duplicate);

        var rejected = PoseProposal.Rehydrate(AnId, Alice.Id, AProposedPose.Named("Throne"), Now, rejection);

        rejected.ShouldSatisfyAllConditions(
            () => rejected.Decision.ShouldBe(rejection),
            () => rejected.Status.ShouldBe(ProposalStatus.Rejected),
            () => rejected.DomainEvents.ShouldBeEmpty());
    }

    [Fact]
    public void Accept_Should_BeAcceptedByTheValidatorAndRaisePoseProposalAccepted_When_TheProposalIsPending()
    {
        var proposal = APendingProposal();

        var acceptance = AcceptAsProposed(proposal, Claire, Later);

        proposal.ShouldSatisfyAllConditions(
            () => acceptance.IsSuccess.ShouldBeTrue(),
            () => proposal.Decision.ShouldBe<ProposalDecision?>(AnAcceptanceAsProposed(Claire.Id, Later)),
            () => proposal.Status.ShouldBe(ProposalStatus.Accepted),
            () => proposal.DomainEvents.ShouldHaveSingleItem().ShouldBe(new PoseProposalAccepted(AnId, Claire.Id, WithAdjustments: false, Later)));
    }

    [Fact]
    public void Accept_Should_Succeed_When_TheValidatorIsTheContributorPromotedSinceProposing()
    {
        var proposal = APendingProposal();
        var alicePromoted = new Validator(new ValidatorId(Alice.Id.Value), CanDecide: true);

        var acceptance = AcceptAsProposed(proposal, alicePromoted, Later);

        acceptance.Value.ShouldBe(AnAcceptanceAsProposed(alicePromoted.Id, Later));
    }

    [Fact]
    public void Accept_Should_FailWithValidatorRequiredWithoutChange_When_TheDeciderCanNoLongerDecide()
    {
        var proposal = APendingProposal();
        var formerValidator = Claire with { CanDecide = false };

        var acceptance = AcceptAsProposed(proposal, formerValidator, Later);

        proposal.ShouldSatisfyAllConditions(
            () => acceptance.Error.ShouldBe(ContributionErrors.ValidatorRequired),
            () => proposal.Decision.ShouldBeNull(),
            () => proposal.DomainEvents.ShouldBeEmpty());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Accept_Should_FailWithProposalAlreadyDecided_When_TheProposalIsAlreadyAccepted(bool directPublication)
    {
        var proposal = directPublication ? ADirectPublication() : APendingProposal();
        if (!directPublication) AcceptAsProposed(proposal, Claire, Now);
        var decision = proposal.Decision;
        proposal.ClearDomainEvents();

        var acceptance = AcceptAsProposed(proposal, Claire, Later);

        proposal.ShouldSatisfyAllConditions(
            () => acceptance.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided),
            () => proposal.Decision.ShouldBe(decision),
            () => proposal.DomainEvents.ShouldBeEmpty());
    }

    [Fact]
    public void Accept_Should_FailWithProposalAlreadyDecided_When_TheProposalIsRejected()
    {
        var proposal = APendingProposal();
        proposal.Reject(Claire, Duplicate, Now);
        var rejection = proposal.Decision;
        proposal.ClearDomainEvents();

        var acceptance = AcceptAsProposed(proposal, Claire, Later);

        proposal.ShouldSatisfyAllConditions(
            () => acceptance.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided),
            () => proposal.Decision.ShouldBe(rejection),
            () => proposal.DomainEvents.ShouldBeEmpty());
    }

    [Fact]
    public void Reject_Should_BeRejectedWithItsReasonAndRaisePoseProposalRejected_When_TheProposalIsPending()
    {
        var proposal = APendingProposal();

        var rejection = proposal.Reject(Claire, Duplicate, Later);

        proposal.ShouldSatisfyAllConditions(
            () => rejection.IsSuccess.ShouldBeTrue(),
            () => proposal.Decision.ShouldBe<ProposalDecision?>(new Rejection(Claire.Id, Later, Duplicate)),
            () => proposal.Status.ShouldBe(ProposalStatus.Rejected),
            () => proposal.DomainEvents.ShouldHaveSingleItem().ShouldBe(new PoseProposalRejected(AnId, Claire.Id, Duplicate, Later)));
    }

    [Fact]
    public void Reject_Should_FailWithValidatorRequired_When_TheDeciderCanNoLongerDecide()
    {
        var proposal = APendingProposal();
        var formerValidator = Claire with { CanDecide = false };

        var rejection = proposal.Reject(formerValidator, Duplicate, Later);

        proposal.ShouldSatisfyAllConditions(
            () => rejection.Error.ShouldBe(ContributionErrors.ValidatorRequired),
            () => proposal.Decision.ShouldBeNull(),
            () => proposal.DomainEvents.ShouldBeEmpty());
    }

    [Theory]
    [InlineData(ProposalStatus.Accepted)]
    [InlineData(ProposalStatus.Rejected)]
    public void Reject_Should_FailWithProposalAlreadyDecided_When_TheProposalIsAlreadyDecided(ProposalStatus decided)
    {
        var proposal = APendingProposal();
        if (decided == ProposalStatus.Accepted) AcceptAsProposed(proposal, Claire, Now);
        else proposal.Reject(Claire, Duplicate, Now);
        var decision = proposal.Decision;
        proposal.ClearDomainEvents();

        var rejection = proposal.Reject(Claire, Duplicate, Later);

        proposal.ShouldSatisfyAllConditions(
            () => rejection.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided),
            () => proposal.Decision.ShouldBe(decision),
            () => proposal.DomainEvents.ShouldBeEmpty());
    }

    [Fact]
    public void Submit_Should_BeAcceptedByTheContributorAsValidatorAtOnce_When_TheContributorIsAValidator()
    {
        var bruno = new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true);
        var brunoAsValidator = new ValidatorId(bruno.Id.Value);
        var throne = AProposedPose.Named("Throne");

        var accepted = PoseProposal.Submit(AnId, bruno, throne, NameAvailability.Available, Now).Value!;

        accepted.Status.ShouldBe(ProposalStatus.Accepted);
        accepted.Decision.ShouldBe<ProposalDecision?>(AnAcceptanceAsProposed(brunoAsValidator, Now));
        accepted.DomainEvents.ShouldBe(
        [
            new PoseProposed(AnId, bruno.Id, throne.Name, Now),
            new PoseProposalAccepted(AnId, brunoAsValidator, WithAdjustments: false, Now),
        ]);
    }

    [Fact]
    public void WasSubmittedBy_Should_BeTrue_When_TheValidatorIsTheContributor()
    {
        var proposal = APendingProposal();

        proposal.WasSubmittedBy(new ValidatorId(Alice.Id.Value)).ShouldBeTrue();
    }

    [Fact]
    public void WasSubmittedBy_Should_BeFalse_When_TheValidatorIsSomeoneElse()
    {
        var proposal = APendingProposal();

        proposal.WasSubmittedBy(Claire.Id).ShouldBeFalse();
    }

    [Fact]
    public void Accept_Should_KeepTheProposedAndRetainedPoses_When_AcceptedWithAdjustments()
    {
        var proposal = APendingProposal();
        var retained = Throne.Retain(Adjusting(flyerDifficulty: "intermediate"));

        var acceptance = proposal.Accept(Claire, retained, note: null, NameAvailability.Available, Later);

        var accepted = acceptance.Value.ShouldNotBeNull();
        proposal.ShouldSatisfyAllConditions(
            () => proposal.Pose.ShouldBe(Throne),
            () => accepted.Retained.ShouldBe(retained),
            () => accepted.HasAdjustments.ShouldBeTrue(),
            () => accepted.Note.ShouldBeNull(),
            () => proposal.Decision.ShouldBe(accepted),
            () => proposal.DomainEvents.ShouldHaveSingleItem().ShouldBe(new PoseProposalAccepted(AnId, Claire.Id, WithAdjustments: true, Later)));
    }

    [Fact]
    public void Accept_Should_BeWithoutAdjustment_When_TheRetainedPoseEqualsTheProposedPose()
    {
        var proposal = APendingProposal();
        var retained = Throne.Retain(Adjusting(name: "  Throne  ", flyerDifficulty: "discovery"));

        var acceptance = proposal.Accept(Claire, retained, note: null, NameAvailability.Available, Later);

        acceptance.Value.ShouldNotBeNull().HasAdjustments.ShouldBeFalse();
        proposal.DomainEvents.ShouldHaveSingleItem().ShouldBe(new PoseProposalAccepted(AnId, Claire.Id, WithAdjustments: false, Later));
    }

    [Fact]
    public void Accept_Should_KeepTheNote_When_AcceptedWithAdjustmentsAndAMessage()
    {
        var proposal = APendingProposal();
        var note = AdjustmentNote.Create("Le flyer ne redescend pas sans danger depuis cette pose.").Value;

        var acceptance = proposal.Accept(Claire, Throne.Retain(Adjusting(canEndFlow: false)), note, NameAvailability.Available, Later);

        acceptance.Value.ShouldNotBeNull().Note.ShouldBe(note);
    }

    [Fact]
    public void Accept_Should_FailWithAdjustmentNoteWithoutAdjustment_When_AMessageAccompaniesAnAcceptanceWithoutAdjustment()
    {
        var proposal = APendingProposal();
        var note = AdjustmentNote.Create("Belle proposition.").Value;

        var acceptance = proposal.Accept(Claire, Throne.Retain(PoseAdjustments.None), note, NameAvailability.Available, Later);

        proposal.ShouldSatisfyAllConditions(
            () => acceptance.Error.ShouldBe(ContributionErrors.AdjustmentNoteWithoutAdjustment),
            () => proposal.Decision.ShouldBeNull(),
            () => proposal.DomainEvents.ShouldBeEmpty());
    }

    [Fact]
    public void Accept_Should_FailWithPoseNameAlreadyInCatalog_When_TheRetainedNameIsPublished()
    {
        var proposal = PoseProposal.Rehydrate(AnId, Alice.Id, AProposedPose.Named("Thron"), Now);

        var acceptance = proposal.Accept(
            Claire, proposal.Pose.Retain(Adjusting(name: "Throne")), note: null, NameAvailability.TakenByPublishedPose, Later);

        proposal.ShouldSatisfyAllConditions(
            () => acceptance.Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog),
            () => proposal.Decision.ShouldBeNull(),
            () => proposal.DomainEvents.ShouldBeEmpty());
    }

    [Fact]
    public void Accept_Should_FailWithPoseNameAlreadyPending_When_AnotherPendingProposalHasTheRetainedName()
    {
        var proposal = PoseProposal.Rehydrate(AnId, Alice.Id, AProposedPose.Named("Starr"), Now);

        var acceptance = proposal.Accept(
            Claire, proposal.Pose.Retain(Adjusting(name: "Star")), note: null, NameAvailability.TakenByPendingProposal, Later);

        proposal.ShouldSatisfyAllConditions(
            () => acceptance.Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending),
            () => proposal.Decision.ShouldBeNull(),
            () => proposal.DomainEvents.ShouldBeEmpty());
    }

    [Fact]
    public void Submit_Should_RetainTheProposedPose_When_PublishedDirectly()
    {
        var bruno = new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true);

        var published = PoseProposal.Submit(AnId, bruno, Throne, NameAvailability.Available, Now).Value!;

        var acceptance = published.Decision.ShouldBeOfType<Acceptance>();
        acceptance.ShouldSatisfyAllConditions(
            () => acceptance.Retained.ShouldBe(new RetainedPose(Throne.Name, Throne.Difficulty, Throne.Flow)),
            () => acceptance.HasAdjustments.ShouldBeFalse(),
            () => acceptance.Note.ShouldBeNull());
    }
}
