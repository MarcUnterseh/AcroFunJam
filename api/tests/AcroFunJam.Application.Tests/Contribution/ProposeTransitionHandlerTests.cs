using AcroFunJam.Application.Contribution.ProposeTransition;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>Proposing a transition between two published poses (story 7, ADR 0028).</summary>
public sealed class ProposeTransitionHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static PublishedPose APose(string name) => new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create(name).Value!, Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Beginner).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
        new PublishedPoseVersion(1));

    private static readonly PublishedPose Throne = APose("Throne");
    private static readonly PublishedPose Bird = APose("Bird");
    private static readonly ProposedTransition Unnamed = ProposedTransition.Create(name: null, "beginner", "beginner", description: null).Value!;

    private FakeContributors _contributors = new(Alice);
    private FakeCatalogPoses _catalogPoses = new(Throne, Bird);
    private readonly FakeTransitionReservation _reservation = new();
    private readonly FakeTransitionProposalRepository _proposals;
    private readonly List<bool> _savesInReservation = [];
    private readonly FakeUnitOfWork _unitOfWork;

    private readonly FakeCatalogTransitions _catalogTransitions = new();
    private FakeCatalogPublisher _publisher;
    private static readonly Contributor Bruno = new(new ContributorId(Guid.NewGuid()), IsValidator: true);

    public ProposeTransitionHandlerTests()
    {
        _proposals = new FakeTransitionProposalRepository(_reservation);
        _unitOfWork = new FakeUnitOfWork { OnSave = () => _savesInReservation.Add(_reservation.IsHeld) };
        _publisher = new FakeCatalogPublisher { TransitionReservation = _reservation };
    }

    private ProposeTransitionHandler Handler(FakeUnitOfWork? unitOfWork = null) =>
        new(_contributors, _catalogPoses, _catalogTransitions, _proposals, _reservation, _publisher, unitOfWork ?? _unitOfWork, new FixedTimeProvider(Now),
            new FakeCatalogTags(null));

    private static ProposeTransition From(PublishedPoseId from, PublishedPoseId to, Contributor? by = null) =>
        new((by ?? Alice).Id, new TransitionPoses(from, to), Unnamed);

    /// <summary>R9: the catalog prevails over a pending proposal taking the same place.</summary>
    [Fact]
    public async Task Handle_Should_FailWithUnnamedTransitionAlreadyInCatalog_When_APublishedTransitionTakesThePlace()
    {
        var slot = TransitionSlot.Of(new TransitionPoses(Throne.Id, Bird.Id), name: null);
        _catalogTransitions.Published.Add(slot);
        _proposals.PendingSlots.Add(slot);

        var result = await Handler().Handle(From(Throne.Id, Bird.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.UnnamedTransitionAlreadyInCatalog);
        _unitOfWork.Saves.ShouldBe(0);
    }

    /// <summary>R2: a validator's transition is published in the same transaction, inside the reservation of its couple.</summary>
    [Fact]
    public async Task Handle_Should_PublishTheTransitionInTheReservation_When_AValidatorProposesIt()
    {
        _contributors = new FakeContributors(Bruno);

        var result = await Handler().Handle(From(Throne.Id, Bird.Id, Bruno), Ct);

        result.Value.ShouldNotBeNull().Status.ShouldBe(ProposalStatus.Accepted);
        _publisher.PublishedTransitions.ShouldHaveSingleItem()
            .ShouldBe((result.Value.Id, new TransitionPoses(Throne.Id, Bird.Id), RetainedTransition.As(Unnamed)));
        _publisher.TransitionPublicationsInReservation.ShouldBe([true]);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_SaveNothing_When_TheCatalogRefusesTheDirectPublication()
    {
        _contributors = new FakeContributors(Bruno);
        _publisher = new FakeCatalogPublisher(ContributionErrors.UnnamedTransitionAlreadyInCatalog);

        var result = await Handler().Handle(From(Throne.Id, Bird.Id, Bruno), Ct);

        result.Error.ShouldBe(ContributionErrors.UnnamedTransitionAlreadyInCatalog);
        _proposals.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_PublishNothing_When_AUserProposesATransition()
    {
        await Handler().Handle(From(Throne.Id, Bird.Id), Ct);

        _publisher.PublishedTransitions.ShouldBeEmpty();
    }

    /// <summary>R9, R10 under concurrency (ADR 0029): the place is checked and taken while the couple of poses is reserved.</summary>
    [Fact]
    public async Task Handle_Should_CheckThePlaceAndSaveInsideTheReservationOfTheCouple_When_ATransitionIsProposed()
    {
        await Handler().Handle(From(Throne.Id, Bird.Id), Ct);

        _reservation.Reserved.ShouldBe([new TransitionPoses(Throne.Id, Bird.Id)]);
        _proposals.CallsInReservation.ShouldBe([true, true]);
        _savesInReservation.ShouldBe([true]);
    }

    [Fact]
    public async Task Handle_Should_FailWithUnnamedTransitionAlreadyPendingAndSaveNothing_When_APendingProposalTakesTheUnnamedPlace()
    {
        var poses = new TransitionPoses(Throne.Id, Bird.Id);
        _proposals.PendingSlots.Add(TransitionSlot.Of(poses, name: null));

        var result = await Handler().Handle(From(Throne.Id, Bird.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.UnnamedTransitionAlreadyPending);
        _proposals.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_AcceptTheProposal_When_APendingProposalTakesAnotherPlaceBetweenTheSamePoses()
    {
        var poses = new TransitionPoses(Throne.Id, Bird.Id);
        _proposals.PendingSlots.Add(TransitionSlot.Of(poses, TransitionName.CreateOptional("Ninja Star").Value));

        var result = await Handler().Handle(From(Throne.Id, Bird.Id), Ct);

        result.IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_Should_AddAndSaveAPendingProposalWithTheCurrentPoseNames_When_AUserProposesATransition()
    {
        var result = await Handler().Handle(From(Throne.Id, Bird.Id), Ct);

        var received = result.Value.ShouldNotBeNull();
        received.ShouldSatisfyAllConditions(
            r => r.Status.ShouldBe(ProposalStatus.Pending),
            r => r.Poses.ShouldBe(new TransitionPoses(Throne.Id, Bird.Id)),
            r => r.FromPoseName.ShouldBe(Throne.Values.Name),
            r => r.ToPoseName.ShouldBe(Bird.Values.Name),
            r => r.Transition.ShouldBe(Unnamed));
        _proposals.Added.ShouldHaveSingleItem().ShouldSatisfyAllConditions(
            p => p.Id.ShouldBe(received.Id),
            p => p.Contributor.ShouldBe(Alice.Id),
            p => p.SubmittedAt.ShouldBe(Now));
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_ReadBothPoseNamesInOneBatch_When_ATransitionIsProposed()
    {
        await Handler().Handle(From(Throne.Id, Bird.Id), Ct);

        _catalogPoses.NameReads.ShouldHaveSingleItem().ShouldBe([Throne.Id, Bird.Id], ignoreOrder: true);
    }

    [Fact]
    public async Task Handle_Should_PresentTheSamePoseTwice_When_TheTransitionIsAWashingMachine()
    {
        var result = await Handler().Handle(From(Throne.Id, Throne.Id), Ct);

        result.Value.ShouldNotBeNull().ShouldSatisfyAllConditions(
            r => r.FromPoseName.ShouldBe(Throne.Values.Name),
            r => r.ToPoseName.ShouldBe(Throne.Values.Name));
    }

    [Fact]
    public async Task Handle_Should_FailWithUnknownContributorAndSaveNothing_When_TheAccountNoLongerExists()
    {
        _contributors = new FakeContributors();

        var result = await Handler().Handle(From(Throne.Id, Bird.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.UnknownContributor);
        _proposals.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    /// <summary>R4: a pose missing from the catalog names is not published, a pose still pending validation included.</summary>
    [Fact]
    public async Task Handle_Should_FailWithToPoseNotFoundAndSaveNothing_When_TheEndPoseIsNotPublished()
    {
        var result = await Handler().Handle(From(Throne.Id, new PublishedPoseId(Guid.NewGuid())), Ct);

        result.Error.ShouldBe(ContributionErrors.ToPoseNotFound);
        _proposals.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_FailWithFromPoseNotFound_When_TheStartPoseIsNotPublished()
    {
        var result = await Handler().Handle(From(new PublishedPoseId(Guid.NewGuid()), Bird.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.FromPoseNotFound);
    }

    [Fact]
    public async Task Handle_Should_ReturnTheFailureOfTheCatalog_When_ItCannotReadThePoseNames()
    {
        var unavailable = new Error("catalog.unavailable", "Le catalogue ne répond pas.");
        _catalogPoses = new FakeCatalogPoses(Throne, Bird) { NamesFailure = unavailable };

        var result = await Handler().Handle(From(Throne.Id, Bird.Id), Ct);

        result.Error.ShouldBe(unavailable);
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_ReturnTheSaveError_When_TheDatabaseRefusesTheProposal()
    {
        var refusal = new Error("contribution.unnamed-transition-already-pending", "Une transition sans nom relie déjà ces poses.");
        var handler = Handler(new FakeUnitOfWork(refusal));

        var result = await handler.Handle(From(Throne.Id, Bird.Id), Ct);

        result.Error.ShouldBe(refusal);
    }
}
