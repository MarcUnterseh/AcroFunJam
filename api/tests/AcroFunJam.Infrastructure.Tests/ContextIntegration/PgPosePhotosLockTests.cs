using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Infrastructure.ContextIntegration;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

/// <summary>
/// The lock of the photos of a pose (story 10, ADR 0039): two changes of the photos of the same pose wait for each other, so
/// that two additions never exceed 5 photos; the photos of another pose, or the pose itself, are not blocked.
/// </summary>
[Trait("Category", "Integration")]
public sealed class PgPosePhotosLockTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private static readonly TimeSpan Granted = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan Blocked = TimeSpan.FromMilliseconds(500);

    private static readonly PoseId Bird = new(Guid.NewGuid());
    private static readonly PoseId Throne = new(Guid.NewGuid());

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private async Task<Result<bool>> Holding(PoseId pose, TaskCompletionSource held, Task release)
    {
        await using var context = database.CreateDbContext();
        return await new PgPosePhotosLock(context).Run(pose, async _ =>
        {
            held.SetResult();
            await release;
            return Result<bool>.Success(true);
        }, Ct);
    }

    private async Task<Result<bool>> Taking(PoseId pose)
    {
        await using var context = database.CreateDbContext();
        return await new PgPosePhotosLock(context).Run(pose, _ => Task.FromResult(Result<bool>.Success(true)), Ct);
    }

    [Fact]
    public async Task Run_Should_WaitForTheOtherChange_When_ItChangesThePhotosOfTheSamePose()
    {
        var held = new TaskCompletionSource();
        var release = new TaskCompletionSource();
        var holding = Holding(Bird, held, release.Task);
        await held.Task.WaitAsync(Granted, Ct);

        var waiting = Taking(Bird);
        (await Task.WhenAny(waiting, Task.Delay(Blocked, Ct))).ShouldNotBe(waiting);

        release.SetResult();
        (await holding).IsSuccess.ShouldBeTrue();
        (await waiting.WaitAsync(Granted, Ct)).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public async Task Run_Should_NotWait_When_ItChangesThePhotosOfAnotherPose()
    {
        var held = new TaskCompletionSource();
        var release = new TaskCompletionSource();
        var holding = Holding(Bird, held, release.Task);
        await held.Task.WaitAsync(Granted, Ct);

        (await Taking(Throne).WaitAsync(Granted, Ct)).IsSuccess.ShouldBeTrue();

        release.SetResult();
        await holding;
    }

    [Fact]
    public async Task Run_Should_NotWaitForTheLockOfThePose_When_ARevisionOfThePoseIsBeingSubmitted()
    {
        var held = new TaskCompletionSource();
        var release = new TaskCompletionSource();
        await using var context = database.CreateDbContext();
        var holding = new PgPoseTaggingLock(context).Run(Bird, async _ =>
        {
            held.SetResult();
            await release.Task;
            return Result<bool>.Success(true);
        }, Ct);
        await held.Task.WaitAsync(Granted, Ct);

        (await Taking(Bird).WaitAsync(Granted, Ct)).IsSuccess.ShouldBeTrue();

        release.SetResult();
        await holding;
    }
}
