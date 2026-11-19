using AcroFunJam.Application.Catalog.RevisePose;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>Revising a published pose from a revision proposal (story 6, ADR 0024, ADR 0026).</summary>
public sealed class RevisePoseHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);
    private static readonly SourceProposalId ARevision = new(Guid.NewGuid());
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly Difficulty BeginnerOnDiscovery = Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!;
    private static readonly FlowBoundaries StartsAndEnds = FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!;

    private readonly FakePoseRepository _poses = new("Bird");
    private readonly FakeUnitOfWork _unitOfWork = new();
    private readonly Pose _thron;

    public RevisePoseHandlerTests()
    {
        _thron = Pose.Publish(
            new PoseId(Guid.NewGuid()), PoseName.Create("Thron").Value!, BeginnerOnDiscovery, StartsAndEnds, source: null,
            nameAlreadyPublished: false, Now).Value!;
        _poses.Add(_thron);
    }

    private RevisePoseHandler Handler() => new(_poses, _unitOfWork, new FixedTimeProvider(Now), new FakeTagListRepository());

    private RevisePose Renaming(string name, PoseVersion? expected = null) =>
        new(_thron.Id, PoseName.Create(name).Value!, BeginnerOnDiscovery, StartsAndEnds, expected ?? PoseVersion.Initial, ARevision);

    [Fact]
    public async Task Handle_Should_ReviseUpdateAndSaveThePose_When_TheExpectedVersionIsCurrent()
    {
        var result = await Handler().Handle(Renaming("Throne"), Ct);

        result.Value.ShouldBe(PoseVersion.Of(2));
        _poses.Updated.ShouldHaveSingleItem().Name.Value.ShouldBe("Throne");
        _unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNotFound_When_ThePoseIsNotInTheCatalog()
    {
        var result = await Handler().Handle(Renaming("Throne") with { Pose = new PoseId(Guid.NewGuid()) }, Ct);

        result.Error.ShouldBe(CatalogErrors.PoseNotFound);
    }

    [Fact]
    public async Task Handle_Should_FailWithPoseNameTakenAndSaveNothing_When_AnotherPoseHasTheNewName()
    {
        var result = await Handler().Handle(Renaming("bird"), Ct);

        result.Error.ShouldBe(CatalogErrors.PoseNameTaken);
        _unitOfWork.Saves.ShouldBe(0);
    }

    /// <summary>A change of case keeps the name key: the pose does not take its own name.</summary>
    [Fact]
    public async Task Handle_Should_Revise_When_OnlyTheCaseOfTheNameChanges()
    {
        var result = await Handler().Handle(Renaming("THRON"), Ct);

        result.IsSuccess.ShouldBeTrue();
    }
}
