using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using AcroFunJam.Infrastructure.Tests.Persistence.Catalog;
using AcroFunJam.Infrastructure.Tests.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence;

/// <summary>A unique index violation or a concurrent decision is a business error, never a 500 (ADR 0017, ADR 0022).</summary>
[Trait("Category", "Integration")]
public sealed class EfUnitOfWorkTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Set<PoseRecord>().ExecuteDeleteAsync(Ct);
        await context.Set<PoseProposalRecord>().ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private async Task<AcroFunJam.Domain.Common.Result<bool>> SavePose(string name)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        new EfPoseRepository(context, aggregates).Add(EfPoseRepositoryTests.APublishedPose(name));
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    private async Task<AcroFunJam.Domain.Common.Result<bool>> SavePendingProposal(string name)
    {
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        new EfPoseProposalRepository(context, aggregates).Add(EfPoseProposalRepositoryTests.APendingProposal(name));
        return await UnitOfWorks.For(context, aggregates).SaveChanges(Ct);
    }

    [Fact]
    public async Task SaveChanges_Should_ReturnPoseNameTaken_When_TheCatalogIndexRejectsTheName()
    {
        (await SavePose("High Bird")).IsSuccess.ShouldBeTrue();

        (await SavePose("high-bird")).Error.ShouldBe(CatalogErrors.PoseNameTaken);
    }

    [Fact]
    public async Task SaveChanges_Should_ReturnAlreadyPending_When_ThePendingIndexRejectsTheName()
    {
        (await SavePendingProposal("Throne")).IsSuccess.ShouldBeTrue();

        (await SavePendingProposal("throne")).Error.ShouldBe(ContributionErrors.PoseNameAlreadyPending);
    }

    [Fact]
    public async Task SaveChanges_Should_Throw_When_TheViolatedConstraintIsNotDeclared()
    {
        (await SavePose("Bird")).IsSuccess.ShouldBeTrue();
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        new EfPoseRepository(context, aggregates).Add(EfPoseRepositoryTests.APublishedPose("bird"));

        await Should.ThrowAsync<DbUpdateException>(() => new EfUnitOfWork(context, aggregates, [], []).SaveChanges(Ct));
    }

    private static readonly DateTimeOffset DecidedAt = new(2026, 11, 4, 9, 0, 0, TimeSpan.Zero);

    private static Validator AValidator() => new(new ValidatorId(Guid.NewGuid()), CanDecide: true);

    private static void AcceptAsProposed(PoseProposal proposal) =>
        proposal.Accept(AValidator(), proposal.Pose.Retain(PoseAdjustments.None), null, NameAvailability.Available, DecidedAt);

    /// <summary>A decision use case in progress: its own context, with the proposal loaded and decided, not saved yet.</summary>
    private sealed record PendingDecision(AcroFunJamDbContext Context, EfUnitOfWork UnitOfWork) : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => Context.DisposeAsync();
    }

    private async Task<PendingDecision> Decide(PoseProposalId id, Action<PoseProposal> decide)
    {
        var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        var repository = new EfPoseProposalRepository(context, aggregates);
        var proposal = (await repository.GetById(id, Ct))!;
        decide(proposal);
        repository.Update(proposal);
        return new PendingDecision(context, UnitOfWorks.For(context, aggregates));
    }

    private async Task<PoseProposalId> SaveAPendingProposal()
    {
        var proposal = EfPoseProposalRepositoryTests.APendingProposal("Throne");
        await using var context = database.CreateDbContext();
        var aggregates = new TrackedAggregates();
        new EfPoseProposalRepository(context, aggregates).Add(proposal);
        (await UnitOfWorks.For(context, aggregates).SaveChanges(Ct)).IsSuccess.ShouldBeTrue();
        return proposal.Id;
    }

    [Fact]
    public async Task SaveChanges_Should_ReturnProposalAlreadyDecided_When_AnotherDecisionWasSavedSinceLoading()
    {
        var id = await SaveAPendingProposal();
        await using var acceptance = await Decide(id, AcceptAsProposed);
        await using var rejection = await Decide(id, p => p.Reject(AValidator(), RejectionReason.Create("Doublon").Value!, DecidedAt));
        (await acceptance.UnitOfWork.SaveChanges(Ct)).IsSuccess.ShouldBeTrue();

        var saved = await rejection.UnitOfWork.SaveChanges(Ct);

        saved.Error.ShouldBe(ContributionErrors.ProposalAlreadyDecided);
    }

    [Fact]
    public async Task SaveChanges_Should_ClearTheChangeTracker_When_AConcurrencyConflictIsDetected()
    {
        var id = await SaveAPendingProposal();
        await using var acceptance = await Decide(id, AcceptAsProposed);
        await using var rejection = await Decide(id, p => p.Reject(AValidator(), RejectionReason.Create("Doublon").Value!, DecidedAt));
        await acceptance.UnitOfWork.SaveChanges(Ct);

        await rejection.UnitOfWork.SaveChanges(Ct);

        rejection.Context.ChangeTracker.Entries().ShouldBeEmpty(); // nothing of the refused work may be saved later in the scope
    }
}
