using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.ContextIntegration;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using AcroFunJam.Infrastructure.Tests.Persistence;
using AcroFunJam.Infrastructure.Tests.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

/// <summary>The reservation of a couple of poses while a place between them is taken (story 7, ADR 0029).</summary>
[Trait("Category", "Integration")]
public sealed class PgTransitionReservationTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private static readonly Error Refused = new("test.refused", "Refusé.");

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<TransitionProposalRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private async Task<int> StoredProposals()
    {
        await using var context = database.CreateDbContext();
        return await context.Set<TransitionProposalRecord>().CountAsync(Ct);
    }

    private async Task<Result<bool>> ProposeInReservation(TransitionProposal proposal, bool succeed = true)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        return await new PgTransitionReservation(context).Run(proposal.Poses, async ct =>
        {
            new EfTransitionProposalRepository(context, aggregates).Add(proposal);
            var saved = await UnitOfWorks.For(context, aggregates).SaveChanges(ct);
            if (saved.IsFailure) return saved;
            return succeed ? Result<bool>.Success(true) : Refused;
        }, Ct);
    }

    [Fact]
    public async Task Run_Should_Commit_When_TheWorkSucceeds()
    {
        (await ProposeInReservation(EfTransitionProposalRepositoryTests.APendingProposal())).IsSuccess.ShouldBeTrue();

        (await StoredProposals()).ShouldBe(1);
    }

    [Fact]
    public async Task Run_Should_RollBack_When_TheWorkFailsAfterSaving()
    {
        var result = await ProposeInReservation(EfTransitionProposalRepositoryTests.APendingProposal(), succeed: false);

        result.Error.ShouldBe(Refused);
        (await StoredProposals()).ShouldBe(0);
    }

    [Fact]
    public async Task Run_Should_WaitForTheOtherReservation_When_BothReserveTheSameCouple()
    {
        var poses = TransitionPoses.Create(Guid.NewGuid(), Guid.NewGuid()).Value!;
        var firstHoldsTheCouple = new TaskCompletionSource();
        var releaseFirst = new TaskCompletionSource();
        var secondStarted = new TaskCompletionSource();

        async Task<Result<bool>> Reserve(TransitionPoses reserved, Func<CancellationToken, Task> work)
        {
            await using var context = database.CreateDbContext();
            return await new PgTransitionReservation(context).Run(reserved, async ct =>
            {
                await work(ct);
                return Result<bool>.Success(true);
            }, Ct);
        }

        var first = Reserve(poses, async _ =>
        {
            firstHoldsTheCouple.SetResult();
            await releaseFirst.Task;
        });
        await firstHoldsTheCouple.Task;
        var second = Reserve(poses, _ =>
        {
            secondStarted.SetResult();
            return Task.CompletedTask;
        });

        (await Task.WhenAny(secondStarted.Task, Task.Delay(TimeSpan.FromMilliseconds(500), Ct))).ShouldNotBe(secondStarted.Task);
        releaseFirst.SetResult();
        await Task.WhenAll(first, second);
        secondStarted.Task.IsCompleted.ShouldBeTrue();
    }

    /// <summary>The direction counts: the reverse couple is another one, and does not wait.</summary>
    [Fact]
    public async Task Run_Should_NotWait_When_TheCoupleIsTheReverseOne()
    {
        var poses = TransitionPoses.Create(Guid.NewGuid(), Guid.NewGuid()).Value!;
        var releaseFirst = new TaskCompletionSource();
        var firstHoldsTheCouple = new TaskCompletionSource();
        await using var firstContext = database.CreateDbContext();
        var first = new PgTransitionReservation(firstContext).Run(poses, async _ =>
        {
            firstHoldsTheCouple.SetResult();
            await releaseFirst.Task;
            return Result<bool>.Success(true);
        }, Ct);
        await firstHoldsTheCouple.Task;

        await using var secondContext = database.CreateDbContext();
        var reverse = new TransitionPoses(poses.To, poses.From);
        var second = await new PgTransitionReservation(secondContext).Run(reverse, _ => Task.FromResult(Result<bool>.Success(true)), Ct)
            .WaitAsync(TimeSpan.FromSeconds(5), Ct);

        second.IsSuccess.ShouldBeTrue();
        releaseFirst.SetResult();
        await first;
    }
}
