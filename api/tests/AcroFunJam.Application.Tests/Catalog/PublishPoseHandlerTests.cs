using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.PublishPose;
using AcroFunJam.Application.Tests.Common;
using AcroFunJam.Application.Tests.Identity;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>In-memory fake of <see cref="IPoseRepository"/>.</summary>
internal sealed class FakePoseRepository(params string[] publishedNames) : IPoseRepository
{
    public List<Pose> Added { get; } = [];

    public void Add(Pose pose) => Added.Add(pose);

    public Task<bool> IsNameTaken(PoseNameKey key, CancellationToken ct) =>
        Task.FromResult(publishedNames.Any(n => PoseName.Create(n).Value!.Key == key) || Added.Any(p => p.Name.Key == key));
}

public sealed class PublishPoseHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static PublishPose Publishing(string name, SourceProposalId? source = null) => new(
        PoseName.Create(name).Value!,
        Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value!,
        FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!,
        source);

    [Fact]
    public async Task Handle_Should_AddAndSaveThePose_When_TheNameIsFree()
    {
        var poses = new FakePoseRepository("Bird");
        var unitOfWork = new FakeUnitOfWork();
        var source = new SourceProposalId(Guid.NewGuid());

        var result = await new PublishPoseHandler(poses, unitOfWork, new FixedTimeProvider(Now)).Handle(Publishing("Throne", source), Ct);

        result.IsSuccess.ShouldBeTrue();
        var added = poses.Added.ShouldHaveSingleItem();
        added.Id.ShouldBe(result.Value);
        added.Name.Value.ShouldBe("Throne");
        added.SourceProposalId.ShouldBe(source);
        added.PublishedAt.ShouldBe(Now);
        unitOfWork.Saves.ShouldBe(1);
    }

    [Fact]
    public async Task Handle_Should_ReturnTheSaveError_When_TheDatabaseRejectsTheName()
    {
        // A concurrent publication of the same name, outside any reservation: the unique index decides (ADR 0017).
        var unitOfWork = new FakeUnitOfWork(CatalogErrors.PoseNameTaken);

        var result = await new PublishPoseHandler(new FakePoseRepository(), unitOfWork, new FixedTimeProvider(Now)).Handle(Publishing("Throne"), Ct);

        result.Error.ShouldBe(CatalogErrors.PoseNameTaken);
    }

    [Fact]
    public async Task Handle_Should_FailAndSaveNothing_When_APublishedPoseHasTheName()
    {
        var poses = new FakePoseRepository("High Bird");
        var unitOfWork = new FakeUnitOfWork();

        var result = await new PublishPoseHandler(poses, unitOfWork, new FixedTimeProvider(Now)).Handle(Publishing("high bird"), Ct);

        result.Error.ShouldBe(CatalogErrors.PoseNameTaken);
        poses.Added.ShouldBeEmpty();
        unitOfWork.Saves.ShouldBe(0);
    }
}
