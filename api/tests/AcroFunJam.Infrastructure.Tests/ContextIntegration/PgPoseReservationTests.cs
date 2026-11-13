using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.ContextIntegration;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using AcroFunJam.Infrastructure.Tests.Persistence;
using AcroFunJam.Infrastructure.Tests.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

[Trait("Category", "Integration")]
public sealed class PgPoseReservationTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private static readonly Error Refused = new("test.refused", "Refusé.");

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<PoseProposalRecord>().ExecuteDeleteAsync(Ct);
        await context.Set<PoseRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static PoseNameKey Key(string name) => PoseName.Create(name).Value!.Key;

    private async Task<Result<bool>> ProposeInReservation(string name, bool succeed = true)
    {
        var proposal = EfPoseProposalRepositoryTests.APendingProposal(name);
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        return await new PgPoseReservation(context).Run(proposal.Pose.Name.Key, async ct =>
        {
            new EfPoseProposalRepository(context, aggregates).Add(proposal);
            var saved = await UnitOfWorks.For(context, aggregates).SaveChanges(ct);
            if (saved.IsFailure) return saved;
            return succeed ? Result<bool>.Success(true) : Refused;
        }, Ct);
    }

    private async Task<int> StoredProposals()
    {
        await using var context = database.CreateDbContext();
        return await context.Set<PoseProposalRecord>().CountAsync(Ct);
    }

    [Fact]
    public async Task Run_Should_Commit_When_TheWorkSucceeds()
    {
        var result = await ProposeInReservation("Throne", succeed: true);

        result.IsSuccess.ShouldBeTrue();
        (await StoredProposals()).ShouldBe(1);
    }

    [Fact]
    public async Task Run_Should_RollBack_When_TheWorkFailsAfterSaving()
    {
        var result = await ProposeInReservation("Throne", succeed: false);

        result.Error.ShouldBe(Refused);
        (await StoredProposals()).ShouldBe(0);
    }

    [Fact]
    public async Task Run_Should_ReturnTheTranslatedError_When_TheIndexRejectsTheName()
    {
        (await ProposeInReservation("Throne")).IsSuccess.ShouldBeTrue();

        var second = await ProposeInReservation("throne"); // the work does not check: the index does

        second.Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
        (await StoredProposals()).ShouldBe(1);
    }

    [Fact]
    public async Task Run_Should_WaitForTheOtherReservation_When_BothReserveTheSameKey()
    {
        var firstHoldsTheKey = new TaskCompletionSource();
        var releaseFirst = new TaskCompletionSource();
        var secondStarted = new TaskCompletionSource();

        async Task<Result<bool>> Reserve(Func<CancellationToken, Task> work)
        {
            await using var context = database.CreateDbContext();
            return await new PgPoseReservation(context).Run(Key("Throne"), async ct =>
            {
                await work(ct);
                return Result<bool>.Success(true);
            }, Ct);
        }

        var first = Reserve(async _ =>
        {
            firstHoldsTheKey.SetResult();
            await releaseFirst.Task;
        });
        await firstHoldsTheKey.Task;
        var second = Reserve(_ =>
        {
            secondStarted.SetResult();
            return Task.CompletedTask;
        });

        (await Task.WhenAny(secondStarted.Task, Task.Delay(TimeSpan.FromMilliseconds(500), Ct))).ShouldNotBe(secondStarted.Task);
        releaseFirst.SetResult();
        await Task.WhenAll(first, second);
        secondStarted.Task.IsCompleted.ShouldBeTrue();
    }

    [Fact]
    public async Task Run_Should_NotWait_When_TheKeysDiffer()
    {
        var releaseFirst = new TaskCompletionSource();
        var firstHoldsTheKey = new TaskCompletionSource();
        await using var firstContext = database.CreateDbContext();
        var first = new PgPoseReservation(firstContext).Run(Key("Throne"), async _ =>
        {
            firstHoldsTheKey.SetResult();
            await releaseFirst.Task;
            return Result<bool>.Success(true);
        }, Ct);
        await firstHoldsTheKey.Task;

        await using var secondContext = database.CreateDbContext();
        var second = await new PgPoseReservation(secondContext).Run(Key("Bird"), _ => Task.FromResult(Result<bool>.Success(true)), Ct)
            .WaitAsync(TimeSpan.FromSeconds(5), Ct);

        second.IsSuccess.ShouldBeTrue();
        releaseFirst.SetResult();
        await first;
    }

    /// <summary>Two use cases on the same published pose are serialised (ADR 0025), even without a name to reserve.</summary>
    [Fact]
    public async Task Run_Should_WaitForTheOtherReservation_When_BothReserveTheSamePose()
    {
        var pose = new PublishedPoseId(Guid.NewGuid());
        var firstHoldsThePose = new TaskCompletionSource();
        var releaseFirst = new TaskCompletionSource();
        var secondStarted = new TaskCompletionSource();

        async Task<Result<bool>> Reserve(Func<CancellationToken, Task> work)
        {
            await using var context = database.CreateDbContext();
            return await new PgPoseReservation(context).Run(pose, key: null, async ct =>
            {
                await work(ct);
                return Result<bool>.Success(true);
            }, Ct);
        }

        var first = Reserve(async _ =>
        {
            firstHoldsThePose.SetResult();
            await releaseFirst.Task;
        });
        await firstHoldsThePose.Task;
        var second = Reserve(_ =>
        {
            secondStarted.SetResult();
            return Task.CompletedTask;
        });

        (await Task.WhenAny(secondStarted.Task, Task.Delay(TimeSpan.FromMilliseconds(500), Ct))).ShouldNotBe(secondStarted.Task);
        releaseFirst.SetResult();
        await Task.WhenAll(first, second);
        secondStarted.Task.IsCompleted.ShouldBeTrue();
    }

    /// <summary>A revision that renames takes the name too (ADR 0025): a pose proposal of that name waits for it.</summary>
    [Fact]
    public async Task Run_Should_WaitForTheReservationOfThePoseAndName_When_ThePoseProposalReservesTheSameName()
    {
        var firstHoldsTheName = new TaskCompletionSource();
        var releaseFirst = new TaskCompletionSource();
        var secondStarted = new TaskCompletionSource();

        async Task<Result<bool>> Hold(Func<CancellationToken, Task<Result<bool>>> work, bool withPose)
        {
            await using var context = database.CreateDbContext();
            var reservation = new PgPoseReservation(context);
            return withPose
                ? await reservation.Run(new PublishedPoseId(Guid.NewGuid()), Key("Throne"), work, Ct)
                : await reservation.Run(Key("throne"), work, Ct);
        }

        var first = Hold(async _ =>
        {
            firstHoldsTheName.SetResult();
            await releaseFirst.Task;
            return Result<bool>.Success(true);
        }, withPose: true);
        await firstHoldsTheName.Task;
        var second = Hold(_ =>
        {
            secondStarted.SetResult();
            return Task.FromResult(Result<bool>.Success(true));
        }, withPose: false);

        (await Task.WhenAny(secondStarted.Task, Task.Delay(TimeSpan.FromMilliseconds(500), Ct))).ShouldNotBe(secondStarted.Task);
        releaseFirst.SetResult();
        await Task.WhenAll(first, second);
        secondStarted.Task.IsCompleted.ShouldBeTrue();
    }
}
