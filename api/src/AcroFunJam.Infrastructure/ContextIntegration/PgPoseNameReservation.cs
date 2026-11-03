using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// PostgreSQL adapter of <see cref="IPoseNameReservation"/> (ADR 0017): one transaction, serialised per name key by
/// a transaction-level advisory lock, committed only when the work succeeds. It spans the names of both the Catalog
/// and Contribution, hence its place among the context integration adapters. The violations of the unique indexes
/// are translated by the unit of work of each context (<see cref="UniqueConstraintError"/>).
/// </summary>
public sealed class PgPoseNameReservation(AcroFunJamDbContext context) : IPoseNameReservation
{
    /// <summary>Namespace of the advisory lock keys, so that another kind of lock never collides with a pose name.</summary>
    private const string LockKeyPrefix = "pose-name:";

    public async Task<Result<T>> Run<T>(PoseNameKey key, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(key);
        ArgumentNullException.ThrowIfNull(work);

        await using var transaction = await context.Database.BeginTransactionAsync(ct);
        var lockKey = LockKeyPrefix + key.Value;
        await context.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock(hashtextextended({lockKey}, 0))", ct);
        var result = await work(ct);
        if (result.IsSuccess) await transaction.CommitAsync(ct);
        else context.ChangeTracker.Clear(); // nothing of the rolled-back work may be saved later in the scope
        return result;
    }
}
