using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>A proposal to revise a published pose (story 6, ADR 0026).</summary>
public sealed class PoseRevisionProposalTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly PoseRevisionProposalId AnId = new(Guid.NewGuid());

    private static readonly PublishedPose Throne = new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create("Throne").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
        new PublishedPoseVersion(1));

    private static PoseChanges FlyerDifficultyTo(string level) =>
        PoseChanges.Create(name: null, baseDifficulty: null, level, canStartFlow: null, canEndFlow: null).Value!;

    [Fact]
    public void Submit_Should_BePendingAndRaisePoseRevisionProposed_When_TheContributorIsNotAValidator()
    {
        var proposal = PoseRevisionProposal.Submit(AnId, Alice, Throne, Throne.Version, FlyerDifficultyTo("discovery"), message: null, revisionAlreadyPending: false, NameAvailability.Available, Now);

        proposal.Value.ShouldNotBeNull().ShouldSatisfyAllConditions(
            p => p.Status.ShouldBe(ProposalStatus.Pending),
            p => p.Contributor.ShouldBe(Alice.Id),
            p => p.Pose.ShouldBe(Throne.Id),
            p => p.SubmittedAt.ShouldBe(Now),
            p => p.DomainEvents.ShouldBe([new PoseRevisionProposed(AnId, Alice.Id, Throne.Id, Now)]));
    }

    [Fact]
    public void Submit_Should_KeepThePriorPoseAndTheVersionItStartedFrom_When_Submitted()
    {
        var proposal = PoseRevisionProposal.Submit(AnId, Alice, Throne, Throne.Version, FlyerDifficultyTo("discovery"), message: null, revisionAlreadyPending: false, NameAvailability.Available, Now).Value!;

        proposal.ShouldSatisfyAllConditions(
            p => p.Revision.Before.ShouldBe(Throne.Values),
            p => p.BaseVersion.ShouldBe(Throne.Version));
    }

    [Fact]
    public void Submit_Should_FailWithRevisionChangesNothing_When_TheChangesKeepEveryValue()
    {
        var proposal = PoseRevisionProposal.Submit(AnId, Alice, Throne, Throne.Version, FlyerDifficultyTo("intermediate"), message: null, revisionAlreadyPending: false, NameAvailability.Available, Now);

        proposal.Error.ShouldBe(ContributionErrors.RevisionChangesNothing);
    }

    [Theory]
    [InlineData(NameAvailability.TakenByPublishedPose, "contribution.pose-name-already-in-catalog")]
    [InlineData(NameAvailability.TakenByPendingProposal, "contribution.pose-name-already-pending")]
    public void Submit_Should_RefuseTheName_When_ItIsTaken(NameAvailability availability, string code)
    {
        var renaming = PoseChanges.Create(name: "Bird", baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null).Value!;

        var proposal = PoseRevisionProposal.Submit(AnId, Alice, Throne, Throne.Version, renaming, message: null, revisionAlreadyPending: false, availability, Now);

        proposal.Error.ShouldNotBeNull().Code.ShouldBe(code);
    }

    [Fact]
    public void Submit_Should_FailWithPoseRevisionAlreadyPending_When_ThePoseHasAPendingRevision()
    {
        var proposal = PoseRevisionProposal.Submit(
            AnId, Alice, Throne, Throne.Version, FlyerDifficultyTo("discovery"), message: null, revisionAlreadyPending: true, NameAvailability.Available, Now);

        proposal.Error.ShouldBe(ContributionErrors.PoseRevisionAlreadyPending);
    }

    /// <summary>The rule is the same for everyone, validators included (decision of 2026-11-12).</summary>
    [Fact]
    public void Submit_Should_FailWithPoseRevisionAlreadyPending_When_AValidatorProposesAndThePoseHasAPendingRevision()
    {
        var bruno = new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true);

        var proposal = PoseRevisionProposal.Submit(
            AnId, bruno, Throne, Throne.Version, FlyerDifficultyTo("discovery"), message: null, revisionAlreadyPending: true, NameAvailability.Available, Now);

        proposal.Error.ShouldBe(ContributionErrors.PoseRevisionAlreadyPending);
    }

    [Fact]
    public void Submit_Should_KeepTheRevisionMessage_When_OneIsGiven()
    {
        var message = RevisionMessage.Create("Throne se découvre dès la première séance côté flyer.").Value;

        var proposal = PoseRevisionProposal.Submit(
            AnId, Alice, Throne, Throne.Version, FlyerDifficultyTo("discovery"), message, revisionAlreadyPending: false, NameAvailability.Available, Now);

        proposal.Value!.Message.ShouldBe(message);
    }

    private static readonly DateTimeOffset Later = Now.AddDays(1);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);

    private static PoseRevisionProposal APendingRevision() =>
        PoseRevisionProposal.Submit(
            AnId, Alice, Throne, Throne.Version, FlyerDifficultyTo("discovery"), message: null, revisionAlreadyPending: false,
            NameAvailability.Available, Now).Value!;

    [Fact]
    public void Accept_Should_RetainTheRevisedPoseAndRaisePoseRevisionAccepted_When_AValidatorAcceptsAsProposed()
    {
        var proposal = APendingRevision();
        proposal.ClearDomainEvents();

        var accepted = proposal.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Later);

        accepted.Value.ShouldNotBeNull().ShouldSatisfyAllConditions(
            a => a.Retained.ShouldBe(proposal.Revision.After.Retain(PoseAdjustments.None)),
            a => a.HasAdjustments.ShouldBeFalse(),
            a => a.By.ShouldBe(Bruno.Id),
            a => a.At.ShouldBe(Later));
        proposal.ShouldSatisfyAllConditions(
            p => p.Status.ShouldBe(ProposalStatus.Accepted),
            p => p.Revision.Before.ShouldBe(Throne.Values),
            p => p.DomainEvents.ShouldBe([new PoseRevisionAccepted(AnId, Bruno.Id, WithAdjustments: false, Later)]));
    }

    [Fact]
    public void Accept_Should_FailWithValidatorRequired_When_TheDeciderCannotDecide()
    {
        var alice = new Validator(Alice.Id.AsValidator(), CanDecide: false);

        APendingRevision().Accept(alice, PoseAdjustments.None, note: null, NameAvailability.Available, Later)
            .Error.ShouldBe(ContributionErrors.ValidatorRequired);
    }

    [Fact]
    public void Accept_Should_FailWithProposalAlreadyDecided_When_TheRevisionWasAlreadyDecided()
    {
        var proposal = APendingRevision();
        proposal.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Later);

        proposal.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Later)
            .Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
    }
    private static readonly RejectionReason AnotherPose = RejectionReason.Create("High Bird est une autre pose.").Value!;

    [Fact]
    public void Reject_Should_RecordTheRejectionWithItsReasonAndRaisePoseRevisionRejected_When_AValidatorRejects()
    {
        var proposal = APendingRevision();
        proposal.ClearDomainEvents();

        var rejected = proposal.Reject(Bruno, AnotherPose, Later);

        rejected.Value.ShouldBe(new Rejection(Bruno.Id, Later, AnotherPose));
        proposal.ShouldSatisfyAllConditions(
            p => p.Status.ShouldBe(ProposalStatus.Rejected),
            p => p.DomainEvents.ShouldBe([new PoseRevisionRejected(AnId, Bruno.Id, AnotherPose, Later)]));
    }

    [Fact]
    public void Reject_Should_FailWithProposalAlreadyDecided_When_TheRevisionWasAlreadyAccepted()
    {
        var proposal = APendingRevision();
        proposal.Accept(Bruno, PoseAdjustments.None, note: null, NameAvailability.Available, Later);

        proposal.Reject(Bruno, AnotherPose, Later).Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
    }

    private static PoseAdjustments Adjusting(string? name = null, string? flyerDifficulty = null) =>
        PoseAdjustments.Create(name, baseDifficulty: null, flyerDifficulty, canStartFlow: null, canEndFlow: null).Value!;

    [Theory]
    [InlineData(null)]
    [InlineData("THRONE")]
    public void NameKeyToReserve_Should_BeNone_When_TheRetainedNameKeepsTheKeyOfThePose(string? adjustedName)
    {
        APendingRevision().NameKeyToReserve(Adjusting(name: adjustedName)).ShouldBeNull();
    }

    [Fact]
    public void NameKeyToReserve_Should_BeTheKeyOfTheRetainedName_When_TheValidatorRenamesThePose()
    {
        APendingRevision().NameKeyToReserve(Adjusting(name: "High Throne")).ShouldBe(PoseName.Create("High Throne").Value!.Key);
    }

    [Theory]
    [InlineData(NameAvailability.TakenByPublishedPose, "contribution.pose-name-already-in-catalog")]
    [InlineData(NameAvailability.TakenByPendingProposal, "contribution.pose-name-already-pending")]
    public void Accept_Should_RefuseTheNameAndStayPending_When_TheRetainedNameIsTaken(NameAvailability availability, string code)
    {
        var proposal = APendingRevision();
        proposal.ClearDomainEvents();

        var accepted = proposal.Accept(Bruno, Adjusting(name: "Bird"), note: null, availability, Later);

        accepted.Error.ShouldNotBeNull().Code.ShouldBe(code);
        proposal.ShouldSatisfyAllConditions(p => p.Status.ShouldBe(ProposalStatus.Pending), p => p.DomainEvents.ShouldBeEmpty());
    }

    /// <summary>Bringing the pose back to its values amounts to rejecting the revision (story 6, R15).</summary>
    [Fact]
    public void Accept_Should_FailWithRetainedRevisionChangesNothing_When_TheAdjustmentsBringThePoseBackToItsValues()
    {
        var proposal = APendingRevision();

        var accepted = proposal.Accept(Bruno, Adjusting(flyerDifficulty: "intermediate"), note: null, NameAvailability.Available, Later);

        accepted.Error.ShouldBe(ContributionErrors.RetainedRevisionChangesNothing);
        proposal.Status.ShouldBe(ProposalStatus.Pending);
    }

    [Fact]
    public void WasSubmittedBy_Should_RecogniseTheContributor_When_TheyDecideAsAValidator()
    {
        var proposal = APendingRevision();

        proposal.WasSubmittedBy(Alice.Id.AsValidator()).ShouldBeTrue();
        proposal.WasSubmittedBy(Bruno.Id).ShouldBeFalse();
    }

    /// <summary>A validator's (or administrator's) revision is accepted at once, by themselves (story 6, R2, ADR 0023).</summary>
    [Fact]
    public void Submit_Should_RecordADirectPublication_When_TheContributorIsAValidator()
    {
        var bruno = new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true);

        var proposal = PoseRevisionProposal.Submit(
            AnId, bruno, Throne, Throne.Version, FlyerDifficultyTo("discovery"), message: null, revisionAlreadyPending: false,
            NameAvailability.Available, Now).Value!;

        proposal.ShouldSatisfyAllConditions(
            p => p.Status.ShouldBe(ProposalStatus.Accepted),
            p => p.Decision.ShouldBe(Acceptance.DirectPublication(p.Revision.After, bruno.Id, Now)),
            p => p.DomainEvents.ShouldBe(
            [
                new PoseRevisionProposed(AnId, bruno.Id, Throne.Id, Now),
                new PoseRevisionAccepted(AnId, bruno.Id.AsValidator(), WithAdjustments: false, Now),
            ]));
    }

    [Fact]
    public void Rehydrate_Should_Throw_When_ADirectPublicationIsNotTheOneOfItsSubmission()
    {
        var bruno = new ContributorId(Guid.NewGuid());
        var revision = APendingRevision().Revision;
        var incoherent = Acceptance.DirectPublication(revision.After, bruno, Later); // not at the instant of the submission

        Should.Throw<InvalidOperationException>(() => PoseRevisionProposal.Rehydrate(
            AnId, bruno, Throne.Id, Throne.Version, revision, Now, message: null, decision: incoherent));
    }

    [Fact]
    public void Submit_Should_FailWithPoseChangedSinceRevisionStarted_When_ThePoseIsNoLongerAtTheVersionItStartedFrom()
    {
        var proposal = PoseRevisionProposal.Submit(
            AnId, Alice, Throne, new PublishedPoseVersion(Throne.Version.Value - 1), FlyerDifficultyTo("discovery"), message: null,
            revisionAlreadyPending: false, NameAvailability.Available, Now);

        proposal.Error.ShouldBe(ContributionErrors.PoseChangedSinceRevisionStarted);
    }

    /// <summary>
    /// Checked first: a pose already revised to the typed values must not be answered « ne change rien » (ADR 0024).
    /// </summary>
    [Fact]
    public void Submit_Should_CheckTheVersionBeforeTheChanges_When_ThePoseAlreadyHasTheProposedValues()
    {
        var proposal = PoseRevisionProposal.Submit(
            AnId, Alice, Throne, new PublishedPoseVersion(Throne.Version.Value - 1), FlyerDifficultyTo("intermediate"), message: null,
            revisionAlreadyPending: true, NameAvailability.Available, Now);

        proposal.Error.ShouldBe(ContributionErrors.PoseChangedSinceRevisionStarted);
    }
}
