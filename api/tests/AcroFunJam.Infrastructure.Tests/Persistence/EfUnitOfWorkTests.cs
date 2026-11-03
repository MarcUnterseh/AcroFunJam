using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using AcroFunJam.Infrastructure.Persistence.Contribution;
using AcroFunJam.Infrastructure.Tests.Persistence.Catalog;
using AcroFunJam.Infrastructure.Tests.Persistence.Contribution;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence;

/// <summary>A unique index violation is a business error, never a 500 (ADR 0017).</summary>
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

        await Should.ThrowAsync<DbUpdateException>(() => new EfUnitOfWork(context, aggregates, []).SaveChanges(Ct));
    }
}
