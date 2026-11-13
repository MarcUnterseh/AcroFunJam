using AcroFunJam.Domain.Common;
using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// The mechanism of the reservations (ADR 0017, ADR 0025, ADR 0029): one transaction, serialised by transaction-level advisory
/// locks taken in the given order, committed only when the work succeeds.
/// </summary>
internal static class AdvisoryLocks
{
    public static async Task<Result<T>> RunLocked<T>(
        AcroFunJamDbContext context, IReadOnlyList<string> lockKeys, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(work);

        await using var transaction = await context.Database.BeginTransactionAsync(ct);
        foreach (var lockKey in lockKeys)
            await context.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock(hashtextextended({lockKey}, 0))", ct);
        var result = await work(ct);
        if (result.IsSuccess) await transaction.CommitAsync(ct);
        else context.ChangeTracker.Clear(); // nothing of the rolled-back work may be saved later in the scope
        return result;
    }
}
