using AcroFunJam.Application.Contribution.ProposePose;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Tests.Contribution;

public sealed class ProposePoseHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);

    private static ProposedPose Throne => ProposedPose.Create("Throne", "beginner", "discovery", true, true).Value!;

    private readonly FakeContributors _contributors = new(Alice);
    private readonly FakeCatalogPoseNames _catalogNames;
    private readonly FakePoseProposalRepository _proposals;
    private readonly FakeCatalogPublisher _publisher;
    private readonly FakePoseNameReservation _reservation = new();
    private readonly FakeUnitOfWork _unitOfWork;
    private readonly List<bool> _savesInReservation = [];

    public ProposePoseHandlerTests()
    {
        _catalogNames = new FakeCatalogPoseNames { Reservation = _reservation };
        _proposals = new FakePoseProposalRepository { Reservation = _reservation };
        _publisher = new FakeCatalogPublisher { Reservation = _reservation };
        _unitOfWork = new FakeUnitOfWork { OnSave = () => _savesInReservation.Add(_reservation.IsHeld) };
    }

    private ProposePoseHandler Handler() =>
        new(_contributors, _catalogNames, _proposals, _publisher, _reservation, _unitOfWork, new FixedTimeProvider(Now));

    private static readonly Contributor Bruno = new(new ContributorId(Guid.NewGuid()), IsValidator: true);

    [Fact]
    public async Task Handle_Should_PublishAndAddAnAcceptedProposal_When_AValidatorProposes()
    {
        var handler = new ProposePoseHandler(
            new FakeContributors(Bruno), _catalogNames, _proposals, _publisher, _reservation, _unitOfWork, new FixedTimeProvider(Now));

        var result = await handler.Handle(new ProposePose(Bruno.Id, Throne), Ct);

        result.Value!.Status.ShouldBe(ProposalStatus.Accepted);
        var published = _publisher.Published.ShouldHaveSingleItem();
        published.Source.ShouldBe(result.Value.Id);
        published.Pose.ShouldBe(Throne.Retain(PoseAdjustments.None)); // a direct publication retains the proposed pose
        _proposals.Added.ShouldHaveSingleItem().Status.ShouldBe(ProposalStatus.Accepted);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_AddNothing_When_TheCatalogRefusesThePublication()
    {
        var refusal = new AcroFunJam.Domain.Common.Error("contribution.pose-name-already-in-catalog", "Pris.");
        var handler = new ProposePoseHandler(
            new FakeContributors(Bruno), _catalogNames, _proposals, new FakeCatalogPublisher(refusal), _reservation, _unitOfWork, new FixedTimeProvider(Now));

        var result = await handler.Handle(new ProposePose(Bruno.Id, Throne), Ct);

        result.Error.ShouldBe(refusal);
        _proposals.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_AddAndSaveAPendingProposal_When_AUserProposesAFreeName()
    {
        var result = await Handler().Handle(new ProposePose(Alice.Id, Throne), Ct);

        result.IsSuccess.ShouldBeTrue();
        result.Value!.Status.ShouldBe(ProposalStatus.Pending);
        result.Value.Pose.ShouldBe(Throne);
        var added = _proposals.Added.ShouldHaveSingleItem();
        added.Id.ShouldBe(result.Value.Id);
        added.Contributor.ShouldBe(Alice.Id);
        added.SubmittedAt.ShouldBe(Now);
        _unitOfWork.Saves.ShouldBe(1);
        _publisher.Published.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_FailWithoutAddingAnything_When_APublishedPoseHasTheNameKey()
    {
        var handler = new ProposePoseHandler(
            _contributors, new FakeCatalogPoseNames("High Bird"), _proposals, _publisher, _reservation, _unitOfWork, new FixedTimeProvider(Now));
        var highBird = ProposedPose.Create("high-bird", "beginner", "discovery", true, true).Value!;

        var result = await handler.Handle(new ProposePose(Alice.Id, highBird), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog);
        _reservation.Reserved.ShouldBe([highBird.Name.Key]);
        _proposals.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_FailWithoutAddingAnything_When_APendingProposalHasTheNameKey()
    {
        var proposals = new FakePoseProposalRepository("Throne");
        var handler = new ProposePoseHandler(
            _contributors, _catalogNames, proposals, _publisher, _reservation, _unitOfWork, new FixedTimeProvider(Now));
        var throne = ProposedPose.Create("throne", "beginner", "discovery", true, true).Value!;

        var result = await handler.Handle(new ProposePose(Alice.Id, throne), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
        proposals.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    // --- Everything that reads or writes the name happens inside the reservation (ADR 0017) -------------

    [Fact]
    public async Task Handle_Should_AskTheCatalogInsideTheReservation_When_AContributorProposes()
    {
        await Handler().Handle(new ProposePose(Alice.Id, Throne), Ct);

        _catalogNames.CallsInReservation.ShouldBe([true]);
    }

    [Fact]
    public async Task Handle_Should_LookForPendingProposalsInsideTheReservation_When_AContributorProposes()
    {
        await Handler().Handle(new ProposePose(Alice.Id, Throne), Ct);

        _proposals.CallsInReservation.ShouldBe([true]);
    }

    [Fact]
    public async Task Handle_Should_AddTheProposalAndSaveInsideTheReservation_When_AContributorProposes()
    {
        await Handler().Handle(new ProposePose(Alice.Id, Throne), Ct);

        _proposals.AddsInReservation.ShouldBe([true]);
        _savesInReservation.ShouldBe([true]);
    }

    [Fact]
    public async Task Handle_Should_PublishInsideTheReservation_When_AValidatorProposes()
    {
        var handler = new ProposePoseHandler(
            new FakeContributors(Bruno), _catalogNames, _proposals, _publisher, _reservation, _unitOfWork, new FixedTimeProvider(Now));

        await handler.Handle(new ProposePose(Bruno.Id, Throne), Ct);

        _publisher.CallsInReservation.ShouldBe([true]);
    }

    // --- Failures ---------------------------------------------------------------------------------

    [Fact]
    public async Task Handle_Should_PropagateTheFailure_When_TheCatalogCannotTellWhetherTheNameIsPublished()
    {
        var failure = new AcroFunJam.Domain.Common.Error("catalog.unavailable", "Indisponible.");
        var handler = new ProposePoseHandler(
            _contributors, new FakeCatalogPoseNames { Failure = failure }, _proposals, _publisher, _reservation, _unitOfWork, new FixedTimeProvider(Now));

        var result = await handler.Handle(new ProposePose(Alice.Id, Throne), Ct);

        result.Error.ShouldBe(failure);
        _proposals.Added.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_ReturnTheSaveError_When_TheDatabaseRejectsTheName()
    {
        var handler = new ProposePoseHandler(
            _contributors, _catalogNames, _proposals, _publisher, _reservation,
            new FakeUnitOfWork(ContributionErrors.PoseNameAlreadyPending), new FixedTimeProvider(Now));

        var result = await handler.Handle(new ProposePose(Alice.Id, Throne), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
    }

    [Fact]
    public async Task Handle_Should_FailWithUnknownContributor_When_TheAccountNoLongerExists()
    {
        var deleted = new ContributorId(Guid.NewGuid());

        var result = await Handler().Handle(new ProposePose(deleted, Throne), Ct);

        result.Error.ShouldBe(ContributionErrors.UnknownContributor);
        _proposals.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }
}
