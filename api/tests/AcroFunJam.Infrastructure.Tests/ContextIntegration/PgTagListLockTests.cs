using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.ContextIntegration;
using AcroFunJam.Infrastructure.Tests.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

/// <summary>
/// The lock of the list of tags (story 8, ADR 0033): shared by the writers of tags, exclusive for the removal of a tag, so that a
/// removal never misses a proposal choosing the tag meanwhile.
/// </summary>
[Trait("Category", "Integration")]
public sealed class PgTagListLockTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    /// <summary>Long enough for a lock not taken to be granted, even on a loaded machine: a blocked one waits until released.</summary>
    private static readonly TimeSpan Granted = TimeSpan.FromSeconds(10);

    /// <summary>How long a lock is watched waiting; a shorter wait could only let a defect through, never fail wrongly.</summary>
    private static readonly TimeSpan Blocked = TimeSpan.FromMilliseconds(500);

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    /// <summary>Holds the lock taken by <paramref name="take"/> until <paramref name="release"/> completes.</summary>
    private async Task<Result<bool>> Holding(
        Func<PgTagListLock, Func<CancellationToken, Task<Result<bool>>>, Task<Result<bool>>> take, TaskCompletionSource held, Task release)
    {
        await using var context = database.CreateDbContext();
        return await take(new PgTagListLock(context), async _ =>
        {
            held.SetResult();
            await release;
            return Result<bool>.Success(true);
        });
    }

    private async Task<Result<bool>> Taking(Func<PgTagListLock, Func<CancellationToken, Task<Result<bool>>>, Task<Result<bool>>> take)
    {
        await using var context = database.CreateDbContext();
        return await take(new PgTagListLock(context), _ => Task.FromResult(Result<bool>.Success(true)));
    }

    [Fact]
    public async Task Shared_Should_NotWait_When_AnotherWriterHoldsTheListShared()
    {
        var held = new TaskCompletionSource();
        var release = new TaskCompletionSource();
        var first = Holding((l, w) => l.Shared(w, Ct), held, release.Task);
        await held.Task;

        try
        {
            var second = Taking((l, w) => l.Shared(w, Ct));

            (await Task.WhenAny(second, Task.Delay(Granted, Ct))).ShouldBe(second);
            (await second).IsSuccess.ShouldBeTrue();
        }
        finally
        {
            release.TrySetResult();
        }

        (await first).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public async Task Exclusive_Should_WaitForTheWriters_When_TheyHoldTheListShared()
    {
        var held = new TaskCompletionSource();
        var release = new TaskCompletionSource();
        var writer = Holding((l, w) => l.Shared(w, Ct), held, release.Task);
        await held.Task;

        var removal = Taking((l, w) => l.Exclusive(w, Ct));
        try
        {
            (await Task.WhenAny(removal, Task.Delay(Blocked, Ct))).ShouldNotBe(removal);
        }
        finally
        {
            release.TrySetResult();
        }

        (await writer).IsSuccess.ShouldBeTrue();
        (await removal).IsSuccess.ShouldBeTrue();
    }

    /// <summary>The reservation of a couple of poses holds the list shared (ADR 0033): a removal waits for the proposal.</summary>
    [Fact]
    public async Task Exclusive_Should_WaitForAReservationOfACoupleOfPoses_When_ItIsHeld()
    {
        var held = new TaskCompletionSource();
        var release = new TaskCompletionSource();
        var reservation = Task.Run(async () =>
        {
            await using var context = database.CreateDbContext();
            return await new PgTransitionReservation(context).Run(
                TransitionPoses.Create(Guid.NewGuid(), Guid.NewGuid()).Value!,
                async _ =>
                {
                    held.SetResult();
                    await release.Task;
                    return Result<bool>.Success(true);
                },
                Ct);
        }, Ct);
        await held.Task;

        var removal = Taking((l, w) => l.Exclusive(w, Ct));
        try
        {
            (await Task.WhenAny(removal, Task.Delay(Blocked, Ct))).ShouldNotBe(removal);
        }
        finally
        {
            release.TrySetResult();
        }

        (await reservation).IsSuccess.ShouldBeTrue();
        (await removal).IsSuccess.ShouldBeTrue();
    }
}
