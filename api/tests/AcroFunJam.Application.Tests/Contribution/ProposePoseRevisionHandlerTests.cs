using AcroFunJam.Application.Contribution.ProposePoseRevision;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>Proposing a revision of a published pose (story 6, ADR 0024 to 0026).</summary>
public sealed class ProposePoseRevisionHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly PublishedPose Throne = new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create("Throne").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
        new PublishedPoseVersion(1));

    private readonly FakePoseReservation _reservation = new();
    private FakeContributors _contributors = new(Alice);
    private FakeCatalogPoses _catalogPoses;
    private FakeCatalogPoseNames _catalogPoseNames = new();
    private FakePoseProposalRepository _poseProposals = new();
    private readonly FakePoseRevisionProposalRepository _revisions = new();
    private readonly FakeUnitOfWork _unitOfWork = new();
    private FakeCatalogPublisher _publisher = new();
    private static readonly Contributor Bruno = new(new ContributorId(Guid.NewGuid()), IsValidator: true);

    public ProposePoseRevisionHandlerTests() => _catalogPoses = new FakeCatalogPoses(Throne) { Reservation = _reservation };

    private ProposePoseRevisionHandler Handler() =>
        new(_contributors, _catalogPoses, _catalogPoseNames, _poseProposals, _revisions, _reservation, _publisher, _unitOfWork, new FixedTimeProvider(Now), new FakeCatalogTags(null));

    private static ProposePoseRevision OfThrone(string? name = null, string? flyerDifficulty = null) => new(
        Alice.Id, Throne.Id, Throne.Version,
        PoseChanges.Create(name, baseDifficulty: null, flyerDifficulty, canStartFlow: null, canEndFlow: null).Value!);

    [Fact]
    public async Task Handle_Should_AddAndSaveAPendingRevision_When_AUserProposesAChange()
    {
        var result = await Handler().Handle(OfThrone(flyerDifficulty: "discovery"), Ct);

        result.Value.ShouldNotBeNull().Status.ShouldBe(ProposalStatus.Pending);
        _revisions.Added.ShouldHaveSingleItem().ShouldSatisfyAllConditions(
            r => r.Id.ShouldBe(result.Value.Id),
            r => r.Contributor.ShouldBe(Alice.Id),
            r => r.Revision.Before.ShouldBe(Throne.Values),
            r => r.Revision.After.Difficulty.Flyer.ShouldBe(DifficultyLevel.Discovery));
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNotFoundAndSaveNothing_When_ThePoseIsNotInTheCatalog()
    {
        _catalogPoses = new FakeCatalogPoses();

        var result = await Handler().Handle(OfThrone(flyerDifficulty: "discovery"), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNotFound);
        _revisions.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_FailWithUnknownContributor_When_TheAccountNoLongerExists()
    {
        _contributors = new FakeContributors();

        var result = await Handler().Handle(OfThrone(flyerDifficulty: "discovery"), Ct);

        result.Error.ShouldBe(ContributionErrors.UnknownContributor);
    }

    [Fact]
    public async Task Handle_Should_PassTheRefusalOnAndSaveNothing_When_TheRevisionChangesNothing()
    {
        var result = await Handler().Handle(OfThrone(flyerDifficulty: "intermediate"), Ct);

        result.Error.ShouldBe(ContributionErrors.RevisionChangesNothing);
        _revisions.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNameAlreadyInCatalog_When_TheNewNameIsPublished()
    {
        _catalogPoseNames = new FakeCatalogPoseNames("Bird");

        var result = await Handler().Handle(OfThrone(name: "bird"), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyInCatalog);
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNameAlreadyPending_When_APendingPoseProposalHasTheNewName()
    {
        _poseProposals = new FakePoseProposalRepository("Bird");

        var result = await Handler().Handle(OfThrone(name: "Bird"), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
    }

    [Fact]
    public async Task Handle_Should_ReserveTheNewNameKey_When_TheRevisionRenamesThePose()
    {
        await Handler().Handle(OfThrone(name: "High Throne"), Ct);

        _reservation.Reserved.ShouldBe([PoseName.Create("High Throne").Value!.Key]);
    }

    [Fact]
    public async Task Handle_Should_NeitherReserveNorCheckTheName_When_TheNameKeyDoesNotChange()
    {
        _catalogPoseNames = new FakeCatalogPoseNames("Throne");

        var result = await Handler().Handle(OfThrone(name: "THRONE"), Ct);

        result.IsSuccess.ShouldBeTrue();
        _reservation.Reserved.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNameAlreadyPending_When_AnotherPendingRevisionReservesTheNewName()
    {
        _revisions.PendingReservedNames.Add("Bird");

        var result = await Handler().Handle(OfThrone(name: "Bird"), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseRevisionAlreadyPending_When_ThePoseHasAPendingRevision()
    {
        _revisions.PosesWithPendingRevision.Add(Throne.Id);

        var result = await Handler().Handle(OfThrone(flyerDifficulty: "discovery"), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseRevisionAlreadyPending);
        _unitOfWork.Saves.ShouldBe(0);
    }

    [Fact]
    public async Task Handle_Should_ReserveThePoseThenTheNewName_When_TheRevisionRenamesThePose()
    {
        await Handler().Handle(OfThrone(name: "High Throne"), Ct);

        _reservation.ReservedPoses.ShouldBe([Throne.Id]);
        _reservation.Reserved.ShouldBe([PoseName.Create("High Throne").Value!.Key]);
    }

    [Fact]
    public async Task Handle_Should_ReserveThePose_When_TheNameKeyDoesNotChange()
    {
        await Handler().Handle(OfThrone(flyerDifficulty: "discovery"), Ct);

        _reservation.ReservedPoses.ShouldBe([Throne.Id]);
        _reservation.Reserved.ShouldBeEmpty();
    }

    [Fact]
    public async Task Handle_Should_KeepTheRevisionMessage_When_TheContributorGivesOne()
    {
        var message = RevisionMessage.Create("Le flyer ne redescend pas sans danger.").Value;

        await Handler().Handle(OfThrone(flyerDifficulty: "discovery") with { Message = message }, Ct);

        _revisions.Added.ShouldHaveSingleItem().Message.ShouldBe(message);
    }

    /// <summary>The values before the revision are those of the pose once reserved: a revision published meanwhile is seen.</summary>
    [Fact]
    public async Task Handle_Should_ReadThePoseAgainInsideTheReservation_When_Submitting()
    {
        await Handler().Handle(OfThrone(flyerDifficulty: "discovery"), Ct);

        _catalogPoses.CallsInReservation.ShouldContain(true);
    }

    private static ProposePoseRevision ByBruno(ProposePoseRevision command) => command with { Contributor = Bruno.Id };

    [Fact]
    public async Task Handle_Should_ReviseThePoseFromItsVersionThenSave_When_AValidatorPublishesDirectly()
    {
        _contributors = new FakeContributors(Bruno);

        var result = await Handler().Handle(ByBruno(OfThrone(flyerDifficulty: "discovery")), Ct);

        result.Value.ShouldNotBeNull().Status.ShouldBe(ProposalStatus.Accepted);
        var revised = _publisher.Revised.ShouldHaveSingleItem();
        revised.Pose.ShouldBe(Throne.Id);
        revised.Expected.ShouldBe(Throne.Version);
        revised.Retained.Difficulty.Flyer.ShouldBe(DifficultyLevel.Discovery);
        _revisions.Added.ShouldHaveSingleItem().Status.ShouldBe(ProposalStatus.Accepted);
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_SaveNothing_When_TheCatalogRefusesTheDirectRevision()
    {
        _contributors = new FakeContributors(Bruno);
        _publisher = new FakeCatalogPublisher(ContributionErrors.PoseChangedSinceRevisionStarted);

        var result = await Handler().Handle(ByBruno(OfThrone(flyerDifficulty: "discovery")), Ct);

        result.Error.ShouldBe(ContributionErrors.PoseChangedSinceRevisionStarted);
        _revisions.Added.ShouldBeEmpty();
        _unitOfWork.Saves.ShouldBe(0);
    }
}
