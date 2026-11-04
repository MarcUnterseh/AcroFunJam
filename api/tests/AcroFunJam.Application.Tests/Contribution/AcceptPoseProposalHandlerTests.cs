using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Contribution.AcceptPoseProposal;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

public sealed class AcceptPoseProposalHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 4, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);

    private readonly PoseProposal _throne = APendingProposal.Named("Throne").Build();
    private readonly PoseProposal _thron = APendingProposal.Named("Thron").Build();
    private readonly FakeValidators _validators = new(Bruno);
    private readonly FakePoseNameReservation _reservation = new();
    private readonly FakeCatalogPoseNames _catalog = new();
    private readonly FakePoseProposalRepository _proposals;
    private readonly FakeCatalogPublisher _publisher;
    private readonly FakeUnitOfWork _unitOfWork;

    /// <summary>For each save: the decisions of the updated proposals, how many poses were already published, and whether the name was reserved.</summary>
    private readonly List<(ProposalDecision?[] Updated, int Published, bool InReservation)> _saves = [];

    public AcceptPoseProposalHandlerTests()
    {
        _proposals = new FakePoseProposalRepository { Reservation = _reservation, Stored = [_throne, _thron] };
        _publisher = new FakeCatalogPublisher { Reservation = _reservation };
        _unitOfWork = new FakeUnitOfWork
        {
            OnSave = () => _saves.Add(([.. _proposals.Updated.Select(p => p.Decision)], _publisher.Published.Count, _reservation.IsHeld)),
        };
    }

    /// <summary>The acceptance of a proposal as proposed: no adjustment, no note.</summary>
    private static AcceptPoseProposal AsProposed(PoseProposalId proposal, ValidatorId by) => new(proposal, by, PoseAdjustments.None, Note: null);

    private static PoseAdjustments Adjusting(string? name = null, string? flyerDifficulty = null) =>
        PoseAdjustments.Create(name, baseDifficulty: null, flyerDifficulty, canStartFlow: null, canEndFlow: null).Value!;

    private AcceptPoseProposalHandler Handler(IPoseProposalRepository? proposals = null, ICatalogPoseNames? catalog = null) =>
        new(_validators, proposals ?? _proposals, catalog ?? _catalog, _reservation, _publisher, _unitOfWork, new FixedTimeProvider(Now));

    [Fact]
    public async Task Handle_Should_FailWithUnknownValidator_When_TheValidatorAccountNoLongerExists()
    {
        var deleted = new ValidatorId(Guid.NewGuid());

        var result = await Handler().Handle(AsProposed(_throne.Id, deleted), Ct);

        result.Error.ShouldBe(ContributionErrors.UnknownValidator);
    }

    [Fact]
    public async Task Handle_Should_FailWithProposalNotFound_When_TheProposalDoesNotExist()
    {
        var result = await Handler().Handle(AsProposed(new PoseProposalId(Guid.NewGuid()), Bruno.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalNotFound);
    }

    [Fact]
    public async Task Handle_Should_PublishTheProposedPoseWithItsProposalAsSource_When_AValidatorAccepts()
    {
        var result = await Handler().Handle(AsProposed(_throne.Id, Bruno.Id), Ct);

        result.Value.ShouldBe(new DecidedPoseProposalDto(_throne.Id, ProposalStatus.Accepted, _throne.Pose.Retain(PoseAdjustments.None), Adjusted: false));
        _publisher.Published.ShouldBe([(_throne.Id, _throne.Pose.Retain(PoseAdjustments.None))]);
    }

    [Fact]
    public async Task Handle_Should_SaveTheDecisionBeforePublishing_When_AValidatorAccepts()
    {
        // The decision is claimed first (conditional update), so that the loser of a race fails as "already decided" (ADR 0022).
        await Handler().Handle(AsProposed(_throne.Id, Bruno.Id), Ct);

        var save = _saves.ShouldHaveSingleItem();
        save.Updated.ShouldBe([Acceptance.Of(_throne.Pose, _throne.Pose.Retain(PoseAdjustments.None), null, Bruno.Id, Now).Value!]);
        save.Published.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_RunInsideTheReservationOfTheProposalName_When_AValidatorAccepts()
    {
        // Every write of a name goes through its reservation (ADR 0017).
        await Handler().Handle(AsProposed(_throne.Id, Bruno.Id), Ct);

        _reservation.Reserved.ShouldBe([_throne.Pose.Name.Key]);
        _saves.ShouldHaveSingleItem().InReservation.ShouldBeTrue();
        _publisher.CallsInReservation.ShouldBe([true]);
    }

    [Fact]
    public async Task Handle_Should_ReadTheProposalAgainInsideTheReservation_When_AValidatorAccepts()
    {
        // A decision committed meanwhile under the same name is seen, and refused as already decided (ADR 0022).
        await Handler().Handle(AsProposed(_throne.Id, Bruno.Id), Ct);

        _proposals.ReadsInReservation.ShouldNotBeEmpty();
        _proposals.ReadsInReservation[^1].ShouldBeTrue();
    }

    [Fact]
    public async Task Handle_Should_NotPublish_When_SavingTheDecisionFailsWithProposalAlreadyDecided()
    {
        // Another decision was saved since the proposal was loaded: the conditional update finds it no longer pending.
        var handler = new AcceptPoseProposalHandler(
            _validators, _proposals, _catalog, _reservation, _publisher, new FakeUnitOfWork(ContributionErrors.ProposalAlreadyDecided),
            new FixedTimeProvider(Now));

        var result = await handler.Handle(AsProposed(_throne.Id, Bruno.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
        _publisher.Published.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_ReturnTheCatalogRefusal_When_TheCatalogRefusesThePublication()
    {
        // A pose of the same name was published in between: the reservation rolls the whole acceptance back (ADR 0022).
        var handler = new AcceptPoseProposalHandler(
            _validators, _proposals, _catalog, _reservation, new FakeCatalogPublisher(ContributionErrors.PoseNameAlreadyInCatalog), _unitOfWork,
            new FixedTimeProvider(Now));

        var result = await handler.Handle(AsProposed(_throne.Id, Bruno.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog);
    }

    [Fact]
    public async Task Handle_Should_NeitherSaveNorPublish_When_TheProposalIsAlreadyDecided()
    {
        // A direct publication: accepted at once by its contributor, a validator.
        var star = PoseProposal.Submit(
            new PoseProposalId(Guid.NewGuid()), new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true),
            ProposedPose.Create("Star", "beginner", "discovery", true, true).Value!, NameAvailability.Available, Now.AddDays(-1)).Value!;
        var proposals = new FakePoseProposalRepository { Stored = [star] };
        var result = await Handler(proposals).Handle(AsProposed(star.Id, Bruno.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
        _saves.ShouldBeEmpty();
        _publisher.Published.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_ReserveTheRetainedName_When_TheNameIsAdjusted()
    {
        await Handler().Handle(new AcceptPoseProposal(_thron.Id, Bruno.Id, Adjusting(name: "Throne"), Note: null), Ct);

        _reservation.Reserved.ShouldBe([PoseName.Create("Throne").Value!.Key]);
    }

    [Fact]
    public async Task Handle_Should_CheckOtherPendingProposalsExceptThisOne_When_TheNameIsAdjusted()
    {
        // The adjusted name has the key of the proposal itself, still pending: no conflict with itself.
        var result = await Handler().Handle(new AcceptPoseProposal(_throne.Id, Bruno.Id, Adjusting(name: "THRONE"), Note: null), Ct);

        result.IsSuccess.ShouldBeTrue();
        _proposals.CallsInReservation.ShouldNotBeEmpty();
        _proposals.CallsInReservation.ShouldAllBe(inReservation => inReservation);
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNameAlreadyPending_When_AnotherPendingProposalHasTheAdjustedName()
    {
        var starr = APendingProposal.Named("Starr").Build();
        var proposals = new FakePoseProposalRepository { Stored = [starr, APendingProposal.Named("Star").Build()] };

        var result = await Handler(proposals).Handle(new AcceptPoseProposal(starr.Id, Bruno.Id, Adjusting(name: "Star"), Note: null), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
        proposals.Updated.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNameAlreadyInCatalog_When_TheAdjustedNameIsPublished()
    {
        var catalog = new FakeCatalogPoseNames("Throne") { Reservation = _reservation };

        var result = await Handler(catalog: catalog).Handle(new AcceptPoseProposal(_thron.Id, Bruno.Id, Adjusting(name: "Throne"), Note: null), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog);
        catalog.CallsInReservation.ShouldBe([true]);
        _publisher.Published.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_PublishTheRetainedPose_When_AcceptedWithAdjustments()
    {
        var adjustments = Adjusting(flyerDifficulty: "intermediate");

        await Handler().Handle(new AcceptPoseProposal(_throne.Id, Bruno.Id, adjustments, Note: null), Ct);

        _publisher.Published.ShouldBe([(_throne.Id, _throne.Pose.Retain(adjustments))]);
    }

    [Fact]
    public async Task Handle_Should_ReturnTheRetainedPoseAsAdjusted_When_AcceptedWithAdjustments()
    {
        var adjustments = Adjusting(flyerDifficulty: "intermediate");

        var result = await Handler().Handle(new AcceptPoseProposal(_throne.Id, Bruno.Id, adjustments, Note: null), Ct);

        result.Value.ShouldBe(new DecidedPoseProposalDto(_throne.Id, ProposalStatus.Accepted, _throne.Pose.Retain(adjustments), Adjusted: true));
    }
}
