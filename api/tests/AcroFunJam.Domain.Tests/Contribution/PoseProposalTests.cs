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

    private static PoseProposal APendingProposal() => PoseProposal.Rehydrate(AnId, Alice.Id, AProposedPose.Named("Throne"), Now);

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
        pending.IsAccepted.ShouldBeFalse();
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

        var acceptance = proposal.Accept(Claire, Later);

        proposal.ShouldSatisfyAllConditions(
            () => acceptance.IsSuccess.ShouldBeTrue(),
            () => proposal.Decision.ShouldBe<ProposalDecision?>(new Acceptance(Claire.Id, Later)),
            () => proposal.Status.ShouldBe(ProposalStatus.Accepted),
            () => proposal.DomainEvents.ShouldHaveSingleItem().ShouldBe(new PoseProposalAccepted(AnId, Claire.Id, Later)));
    }

    [Fact]
    public void Accept_Should_Succeed_When_TheValidatorIsTheContributorPromotedSinceProposing()
    {
        var proposal = APendingProposal();
        var alicePromoted = new Validator(new ValidatorId(Alice.Id.Value), CanDecide: true);

        var acceptance = proposal.Accept(alicePromoted, Later);

        acceptance.Value.ShouldBe(new Acceptance(alicePromoted.Id, Later));
    }

    [Fact]
    public void Accept_Should_FailWithValidatorRequiredWithoutChange_When_TheDeciderCanNoLongerDecide()
    {
        var proposal = APendingProposal();
        var formerValidator = Claire with { CanDecide = false };

        var acceptance = proposal.Accept(formerValidator, Later);

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
        if (!directPublication) proposal.Accept(Claire, Now);
        var decision = proposal.Decision;
        proposal.ClearDomainEvents();

        var acceptance = proposal.Accept(Claire, Later);

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

        var acceptance = proposal.Accept(Claire, Later);

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
        if (decided == ProposalStatus.Accepted) proposal.Accept(Claire, Now);
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
        accepted.IsAccepted.ShouldBeTrue();
        accepted.Decision.ShouldBe<ProposalDecision?>(new Acceptance(brunoAsValidator, Now));
        accepted.DomainEvents.ShouldBe(
        [
            new PoseProposed(AnId, bruno.Id, throne.Name, Now),
            new PoseProposalAccepted(AnId, brunoAsValidator, Now),
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
}
