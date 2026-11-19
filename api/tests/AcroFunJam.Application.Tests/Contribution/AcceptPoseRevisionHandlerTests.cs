using AcroFunJam.Application.Contribution.AcceptPoseRevision;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>Accepting a revision proposal: the decision is claimed, then the pose revised, in one transaction (ADR 0022, ADR 0026).</summary>
public sealed class AcceptPoseRevisionHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly PublishedPose Throne = new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create("Throne").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
        new PublishedPoseVersion(4));

    private readonly PoseRevisionProposal _revision = PoseRevisionProposal.Submit(
        new PoseRevisionProposalId(Guid.NewGuid()), new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: false), Throne, Throne.Version,
        PoseChanges.Create(name: null, baseDifficulty: null, "discovery", canStartFlow: null, canEndFlow: null).Value!, message: null,
        revisionAlreadyPending: false, NameAvailability.Available, Now.AddDays(-1)).Value!;

    private readonly FakePoseReservation _reservation = new();
    private readonly FakePoseRevisionProposalRepository _revisions = new();
    private readonly FakeCatalogPublisher _publisher;
    private FakeUnitOfWork _unitOfWork = new();
    private FakeValidators _validators = new(Bruno);
    private FakeCatalogPoseNames _catalogPoseNames = new();
    private FakePoseProposalRepository _poseProposals = new();

    public AcceptPoseRevisionHandlerTests()
    {
        _revisions.Stored.Add(_revision);
        _publisher = new FakeCatalogPublisher { Reservation = _reservation };
    }

    private AcceptPoseRevisionHandler Handler(FakeCatalogPublisher? publisher = null) =>
        new(_validators, _revisions, _catalogPoseNames, _poseProposals, _reservation, publisher ?? _publisher,
            _unitOfWork, new FixedTimeProvider(Now), new FakeCatalogTags(null));

    private AcceptPoseRevision AsProposed(PoseRevisionProposalId? id = null) => new(id ?? _revision.Id, Bruno.Id, PoseAdjustments.None, Note: null);

    [Fact]
    public async Task Handle_Should_ClaimTheDecisionThenReviseThePoseFromItsBaseVersion_When_AValidatorAcceptsAsProposed()
    {
        var result = await Handler().Handle(AsProposed(), Ct);

        result.Value.ShouldNotBeNull().Status.ShouldBe(ProposalStatus.Accepted);
        _revisions.Updated.ShouldHaveSingleItem().Status.ShouldBe(ProposalStatus.Accepted);
        _publisher.Revised.ShouldHaveSingleItem().ShouldBe((_revision.Id, Throne.Id, Throne.Version, _revision.Revision.After.Retain(PoseAdjustments.None)));
        _publisher.CallsInReservation.ShouldBe([true]);
        _reservation.ReservedPoses.ShouldBe([Throne.Id]);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_FailWithUnknownValidator_When_TheValidatorAccountNoLongerExists()
    {
        _validators = new FakeValidators();

        (await Handler().Handle(AsProposed(), Ct)).Error.ShouldBe(ContributionErrors.UnknownValidator);
    }

    [Fact]
    public async Task Handle_Should_FailWithProposalNotFound_When_TheRevisionProposalDoesNotExist()
    {
        (await Handler().Handle(AsProposed(new PoseRevisionProposalId(Guid.NewGuid())), Ct)).Error.ShouldBe(ContributionErrors.ProposalNotFound);
    }

    /// <summary>Another decision was saved since the proposal was loaded: the conditional update finds it no longer pending.</summary>
    [Fact]
    public async Task Handle_Should_NotReviseThePose_When_SavingTheDecisionFailsWithProposalAlreadyDecided()
    {
        _unitOfWork = new FakeUnitOfWork(ContributionErrors.ProposalAlreadyDecided);

        var result = await Handler().Handle(AsProposed(), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
        _publisher.Revised.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_PassTheCatalogRefusalOn_When_TheCatalogRefusesTheRevision()
    {
        var result = await Handler(new FakeCatalogPublisher(ContributionErrors.PoseChangedSinceRevisionStarted)).Handle(AsProposed(), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseChangedSinceRevisionStarted);
    }

    private AcceptPoseRevision Renaming(string name) =>
        new(_revision.Id, Bruno.Id, PoseAdjustments.Create(name, baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null).Value!, Note: null);

    [Fact]
    public async Task Handle_Should_ReserveOnlyThePose_When_TheRetainedNameKeepsTheKeyOfThePose()
    {
        await Handler().Handle(Renaming("THRONE"), Ct);

        _reservation.ReservedPoses.ShouldBe([Throne.Id]);
        _reservation.Reserved.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_ReserveThePoseThenTheRetainedName_When_TheValidatorRenamesThePose()
    {
        await Handler().Handle(Renaming("High Throne"), Ct);

        _reservation.ReservedPoses.ShouldBe([Throne.Id]);
        _reservation.Reserved.ShouldBe([PoseName.Create("High Throne").Value!.Key]);
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNameAlreadyInCatalog_When_TheRetainedNameIsPublished()
    {
        _catalogPoseNames = new FakeCatalogPoseNames("Bird");

        (await Handler().Handle(Renaming("bird"), Ct)).Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog);
        _publisher.Revised.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNameAlreadyPending_When_APendingPoseProposalHasTheRetainedName()
    {
        _poseProposals = new FakePoseProposalRepository("Bird");

        (await Handler().Handle(Renaming("Bird"), Ct)).Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNameAlreadyPending_When_AnotherPendingRevisionReservesTheRetainedName()
    {
        _revisions.PendingReservedNames.Add("Bird");

        (await Handler().Handle(Renaming("Bird"), Ct)).Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
    }

    /// <summary>The name this revision reserves itself is left out: it does not take its own name.</summary>
    [Fact]
    public async Task Handle_Should_Accept_When_TheRetainedNameIsTheOneThisRevisionReserves()
    {
        var renaming = PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.NewGuid()), new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: false), Throne, Throne.Version,
            PoseChanges.Create(name: "High Throne", baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null).Value!,
            message: null, revisionAlreadyPending: false, NameAvailability.Available, Now.AddDays(-1)).Value!;
        _revisions.Stored.Add(renaming);

        var result = await Handler().Handle(new AcceptPoseRevision(renaming.Id, Bruno.Id, PoseAdjustments.None, Note: null), Ct);

        result.IsSuccess.ShouldBeTrue();
    }
}
