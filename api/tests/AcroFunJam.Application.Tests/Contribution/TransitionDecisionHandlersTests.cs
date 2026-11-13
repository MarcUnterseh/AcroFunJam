using AcroFunJam.Application.Contribution.AcceptTransitionProposal;
using AcroFunJam.Application.Contribution.CountPendingPoseProposals;
using AcroFunJam.Application.Contribution.GetMyProposals;
using AcroFunJam.Application.Contribution.GetPendingPoseProposals;
using AcroFunJam.Application.Contribution.RejectTransitionProposal;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>Deciding on a transition proposal, and transitions in the validation queue (story 7, R13 to R20, ADR 0028).</summary>
public sealed class TransitionDecisionHandlersTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = Now.AddDays(2);
    private static readonly ContributorId Alice = new(Guid.NewGuid());
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static PublishedPose APose(string name) => new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create(name).Value!, Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Beginner).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
        new PublishedPoseVersion(1));

    private static readonly PublishedPose Star = APose("Star");
    private static readonly PublishedPose Throne = APose("Throne");
    private static readonly TransitionPoses StarToStar = new(Star.Id, Star.Id);

    private static TransitionProposal APending(string? name = "ninja star", TransitionPoses? poses = null, DateTimeOffset? at = null) =>
        TransitionProposal.Rehydrate(
            new TransitionProposalId(Guid.NewGuid()), Alice, poses ?? StarToStar,
            ProposedTransition.Create(name, "advanced", "intermediate", description: null).Value!, at ?? Now);

    private static TransitionAdjustments Adjusting(string? name = null, string? flyer = null) =>
        TransitionAdjustments.Create(name, baseDifficulty: null, flyer, description: null).Value!;

    private readonly FakeTransitionReservation _reservation = new();
    private readonly FakeTransitionProposalRepository _proposals;
    private readonly FakeCatalogTransitions _catalogTransitions = new();
    private readonly FakeCatalogPoses _catalogPoses = new(Star, Throne);
    private FakeValidators _validators = new(Bruno);
    private FakeCatalogPublisher _publisher;
    private readonly List<bool> _savesInReservation = [];
    private readonly FakeUnitOfWork _unitOfWork;

    public TransitionDecisionHandlersTests()
    {
        _proposals = new FakeTransitionProposalRepository(_reservation);
        _publisher = new FakeCatalogPublisher { TransitionReservation = _reservation };
        _unitOfWork = new FakeUnitOfWork { OnSave = () => _savesInReservation.Add(_reservation.IsHeld) };
    }

    private AcceptTransitionProposalHandler Accepting() =>
        new(_validators, _proposals, _catalogPoses, _catalogTransitions, _reservation, _publisher, _unitOfWork, new FixedTimeProvider(Later));

    private RejectTransitionProposalHandler Rejecting() => new(_validators, _proposals, _catalogPoses, _unitOfWork, new FixedTimeProvider(Later));

    private TransitionProposal Stored(TransitionProposal proposal)
    {
        _proposals.Stored.Add(proposal);
        return proposal;
    }

    // --- Accepting ----------------------------------------------------------------------------

    [Fact]
    public async Task Accept_Should_RecordThenPublishTheRetainedTransitionInsideTheReservation_When_AValidatorAccepts()
    {
        var proposal = Stored(APending());

        var result = await Accepting().Handle(new AcceptTransitionProposal(proposal.Id, Bruno.Id, Adjusting(name: "Ninja Star"), Note: null), Ct);

        var decided = result.Value.ShouldNotBeNull();
        decided.ShouldSatisfyAllConditions(
            d => d.Status.ShouldBe(ProposalStatus.Accepted),
            d => d.HasAdjustments.ShouldBeTrue(),
            d => d.FromPoseName.ShouldBe(Star.Values.Name),
            d => d.Retained!.Name!.Value.ShouldBe("Ninja Star"));
        _reservation.Reserved.ShouldBe([StarToStar]);
        _proposals.Updated.ShouldBe([proposal]);
        _publisher.PublishedTransitions.ShouldHaveSingleItem().ShouldBe((proposal.Id, StarToStar, decided.Retained!));
        _publisher.TransitionPublicationsInReservation.ShouldBe([true]);
        _savesInReservation.ShouldBe([true]);
    }

    [Fact]
    public async Task Accept_Should_FailWithProposalNotFound_When_NoTransitionProposalHasTheId()
    {
        var result = await Accepting().Handle(new AcceptTransitionProposal(new TransitionProposalId(Guid.NewGuid()), Bruno.Id, TransitionAdjustments.None, null), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalNotFound);
    }

    [Fact]
    public async Task Accept_Should_FailWithUnknownValidator_When_TheAccountNoLongerExists()
    {
        _validators = new FakeValidators();

        var result = await Accepting().Handle(new AcceptTransitionProposal(Stored(APending()).Id, Bruno.Id, TransitionAdjustments.None, null), Ct);

        result.Error.ShouldBe(ContributionErrors.UnknownValidator);
    }

    /// <summary>R18: the place of the retained transition, read in the catalog, prevails.</summary>
    [Fact]
    public async Task Accept_Should_FailAndPublishNothing_When_ThePlaceOfTheRetainedTransitionIsTakenInTheCatalog()
    {
        var proposal = Stored(APending());
        _catalogTransitions.Published.Add(proposal.SlotIfAccepted(TransitionAdjustments.None));

        var result = await Accepting().Handle(new AcceptTransitionProposal(proposal.Id, Bruno.Id, TransitionAdjustments.None, null), Ct);

        result.Error.ShouldBe(ContributionErrors.TransitionNameAlreadyInCatalog);
        _publisher.PublishedTransitions.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    /// <summary>The proposal itself is left out of the pending ones taking the retained place.</summary>
    [Fact]
    public async Task Accept_Should_AskForTheOtherPendingProposalsOnly_When_CheckingTheRetainedPlace()
    {
        var proposal = Stored(APending());
        _proposals.PendingSlots.Add(proposal.Slot);

        var result = await Accepting().Handle(new AcceptTransitionProposal(proposal.Id, Bruno.Id, TransitionAdjustments.None, null), Ct);

        result.IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public async Task Accept_Should_FailWithTransitionNameAlreadyPending_When_AnotherPendingProposalTakesTheRetainedName()
    {
        var proposal = Stored(APending(name: null));
        var other = Stored(APending(name: "Ninja Star"));
        _proposals.PendingSlots.Add(other.Slot);

        var result = await Accepting().Handle(new AcceptTransitionProposal(proposal.Id, Bruno.Id, Adjusting(name: "ninja star"), null), Ct);

        result.Error.ShouldBe(ContributionErrors.TransitionNameAlreadyPending);
    }

    [Fact]
    public async Task Accept_Should_ReturnTheRefusalOfTheCatalog_When_ThePublicationFails()
    {
        var proposal = Stored(APending());
        _publisher = new FakeCatalogPublisher(ContributionErrors.UnnamedTransitionAlreadyInCatalog);

        var result = await Accepting().Handle(new AcceptTransitionProposal(proposal.Id, Bruno.Id, TransitionAdjustments.None, null), Ct);

        result.Error.ShouldBe(ContributionErrors.UnnamedTransitionAlreadyInCatalog);
    }

    // --- Rejecting ----------------------------------------------------------------------------

    [Fact]
    public async Task Reject_Should_RecordTheRejection_When_AValidatorRejects()
    {
        var proposal = Stored(APending());
        var reason = RejectionReason.Create("Cette transition arrive en Bird, pas en Star : propose-la vers Bird.").Value!;

        var result = await Rejecting().Handle(new RejectTransitionProposal(proposal.Id, Bruno.Id, reason), Ct);

        result.Value.ShouldNotBeNull().Status.ShouldBe(ProposalStatus.Rejected);
        _proposals.Updated.ShouldBe([proposal]);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Reject_Should_FailWithProposalAlreadyDecided_When_TheProposalWasAccepted()
    {
        var proposal = Stored(APending());
        proposal.Accept(Bruno, TransitionAdjustments.None, null, TransitionSlotAvailability.Available, Now);

        var result = await Rejecting().Handle(new RejectTransitionProposal(proposal.Id, Bruno.Id, RejectionReason.Create("Doublon.").Value!), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
        _unitOfWork.Saves.ShouldBe(0);
    }

    // --- Validation queue ---------------------------------------------------------------------

    /// <summary>R13: the current names of the poses, read in one batch; the oldest first, all kinds together.</summary>
    [Fact]
    public async Task Queue_Should_PresentTheTransitionsWithTheCurrentPoseNamesAmongTheOtherProposals_When_SomeArePending()
    {
        var transition = APending(name: null, poses: new TransitionPoses(Throne.Id, Star.Id), at: Now);
        var pose = APendingProposal.Named("High Bird").By(Alice).SubmittedAt(Now.AddDays(-1)).Build();
        var handler = new GetPendingPoseProposalsHandler(
            new FakePendingPoseProposalsReader(pose), new FakePendingPoseRevisionsReader(), new FakeContributorEmails((Alice, "alice@example.org")),
            new FakePendingTransitionProposalsReader(transition), _catalogPoses);

        var queue = (await handler.Handle(new GetPendingPoseProposals(Bruno.Id), Ct)).Value!;

        queue.Count.ShouldBe(2);
        queue[1].ShouldBe(new PendingTransitionProposalDto(
            transition.Id, transition.Poses, Throne.Values.Name, Star.Values.Name, transition.Proposed, "alice@example.org", IsYou: false, Now));
        _catalogPoses.NameReads.ShouldHaveSingleItem().ShouldBe([Throne.Id, Star.Id], ignoreOrder: true);
    }

    /// <summary>R21: « Mes propositions » presents the transitions with the current names of their poses, read in one batch.</summary>
    [Fact]
    public async Task MyProposals_Should_PresentTheTransitionsWithTheCurrentPoseNames_When_TheContributorProposedSome()
    {
        var transition = APending(name: null, poses: new TransitionPoses(Throne.Id, Star.Id));
        var someoneElse = TransitionProposal.Rehydrate(
            new TransitionProposalId(Guid.NewGuid()), new ContributorId(Guid.NewGuid()), StarToStar,
            ProposedTransition.Create(null, "beginner", "beginner", null).Value!, Now);
        var handler = new GetMyProposalsHandler(
            new FakeMyPoseProposalsReader(), new FakeMyPoseRevisionsReader(), new FakeMyTransitionProposalsReader(transition, someoneElse), _catalogPoses);

        var mine = (await handler.Handle(new GetMyProposals(Alice), Ct)).Value!;

        var presented = mine.ShouldHaveSingleItem().ShouldBeOfType<MyTransitionProposal>();
        presented.Id.ShouldBe(transition.Id);
        presented.FromPoseName.ShouldBe(Throne.Values.Name);
        presented.ToPoseName.ShouldBe(Star.Values.Name);
    }

    [Fact]
    public async Task Count_Should_CountTheTransitions_When_SomeArePending()
    {
        var handler = new CountPendingPoseProposalsHandler(
            new FakePendingPoseProposalsReader(), new FakePendingPoseRevisionsReader(), new FakePendingTransitionProposalsReader(APending(), APending(name: null)));

        (await handler.Handle(new CountPendingPoseProposals(), Ct)).Value.ShouldBe(2);
    }
}
