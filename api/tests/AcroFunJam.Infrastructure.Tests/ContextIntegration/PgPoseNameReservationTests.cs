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
public sealed class PgPoseNameReservationTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
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
        return await new PgPoseNameReservation(context).Run(proposal.Pose.Name.Key, async ct =>
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
            return await new PgPoseNameReservation(context).Run(Key("Throne"), async ct =>
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
        var first = new PgPoseNameReservation(firstContext).Run(Key("Throne"), async _ =>
        {
            firstHoldsTheKey.SetResult();
            await releaseFirst.Task;
            return Result<bool>.Success(true);
        }, Ct);
        await firstHoldsTheKey.Task;

        await using var secondContext = database.CreateDbContext();
        var second = await new PgPoseNameReservation(secondContext).Run(Key("Bird"), _ => Task.FromResult(Result<bool>.Success(true)), Ct)
            .WaitAsync(TimeSpan.FromSeconds(5), Ct);

        second.IsSuccess.ShouldBeTrue();
        releaseFirst.SetResult();
        await first;
    }
}
