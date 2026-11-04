using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Contribution.AcceptPoseProposal;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Tests.Contribution;

public sealed class AcceptPoseProposalHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 4, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);

    private readonly PoseProposal _throne = APendingProposal.Named("Throne").Build();
    private readonly FakeValidators _validators = new(Bruno);
    private readonly FakePoseNameReservation _reservation = new();
    private readonly FakePoseProposalRepository _proposals;
    private readonly FakeCatalogPublisher _publisher;
    private readonly FakeUnitOfWork _unitOfWork;

    /// <summary>For each save: the decisions of the updated proposals, how many poses were already published, and whether the name was reserved.</summary>
    private readonly List<(ProposalDecision?[] Updated, int Published, bool InReservation)> _saves = [];

    public AcceptPoseProposalHandlerTests()
    {
        _proposals = new FakePoseProposalRepository { Reservation = _reservation, Stored = [_throne] };
        _publisher = new FakeCatalogPublisher { Reservation = _reservation };
        _unitOfWork = new FakeUnitOfWork
        {
            OnSave = () => _saves.Add(([.. _proposals.Updated.Select(p => p.Decision)], _publisher.Published.Count, _reservation.IsHeld)),
        };
    }

    private AcceptPoseProposalHandler Handler() =>
        new(_validators, _proposals, _reservation, _publisher, _unitOfWork, new FixedTimeProvider(Now));

    [Fact]
    public async Task Handle_Should_FailWithUnknownValidator_When_TheValidatorAccountNoLongerExists()
    {
        var deleted = new ValidatorId(Guid.NewGuid());

        var result = await Handler().Handle(new AcceptPoseProposal(_throne.Id, deleted), Ct);

        result.Error.ShouldBe(ContributionErrors.UnknownValidator);
    }

    [Fact]
    public async Task Handle_Should_FailWithProposalNotFound_When_TheProposalDoesNotExist()
    {
        var result = await Handler().Handle(new AcceptPoseProposal(new PoseProposalId(Guid.NewGuid()), Bruno.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalNotFound);
    }

    [Fact]
    public async Task Handle_Should_PublishTheProposedPoseWithItsProposalAsSource_When_AValidatorAccepts()
    {
        var result = await Handler().Handle(new AcceptPoseProposal(_throne.Id, Bruno.Id), Ct);

        result.Value.ShouldBe(new DecidedPoseProposalDto(_throne.Id, ProposalStatus.Accepted, _throne.Pose));
        _publisher.Published.ShouldBe([(_throne.Id, _throne.Pose)]);
    }

    [Fact]
    public async Task Handle_Should_SaveTheDecisionBeforePublishing_When_AValidatorAccepts()
    {
        // The decision is claimed first (conditional update), so that the loser of a race fails as "already decided" (ADR 0022).
        await Handler().Handle(new AcceptPoseProposal(_throne.Id, Bruno.Id), Ct);

        var save = _saves.ShouldHaveSingleItem();
        save.Updated.ShouldBe([new Acceptance(Bruno.Id, Now)]);
        save.Published.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_RunInsideTheReservationOfTheProposalName_When_AValidatorAccepts()
    {
        // Every write of a name goes through its reservation (ADR 0017).
        await Handler().Handle(new AcceptPoseProposal(_throne.Id, Bruno.Id), Ct);

        _reservation.Reserved.ShouldBe([_throne.Pose.Name.Key]);
        _saves.ShouldHaveSingleItem().InReservation.ShouldBeTrue();
        _publisher.CallsInReservation.ShouldBe([true]);
    }

    [Fact]
    public async Task Handle_Should_NotPublish_When_SavingTheDecisionFailsWithProposalAlreadyDecided()
    {
        // Another decision was saved since the proposal was loaded: the conditional update finds it no longer pending.
        var handler = new AcceptPoseProposalHandler(
            _validators, _proposals, _reservation, _publisher, new FakeUnitOfWork(ContributionErrors.ProposalAlreadyDecided), new FixedTimeProvider(Now));

        var result = await handler.Handle(new AcceptPoseProposal(_throne.Id, Bruno.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
        _publisher.Published.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_ReturnTheCatalogRefusal_When_TheCatalogRefusesThePublication()
    {
        // A pose of the same name was published in between: the reservation rolls the whole acceptance back (ADR 0022).
        var handler = new AcceptPoseProposalHandler(
            _validators, _proposals, _reservation, new FakeCatalogPublisher(ContributionErrors.PoseNameAlreadyInCatalog), _unitOfWork,
            new FixedTimeProvider(Now));

        var result = await handler.Handle(new AcceptPoseProposal(_throne.Id, Bruno.Id), Ct);

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
        var handler = new AcceptPoseProposalHandler(_validators, proposals, _reservation, _publisher, _unitOfWork, new FixedTimeProvider(Now));

        var result = await handler.Handle(new AcceptPoseProposal(star.Id, Bruno.Id), Ct);

        result.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
        _saves.ShouldBeEmpty();
        _publisher.Published.ShouldBeEmpty();
    }
}
