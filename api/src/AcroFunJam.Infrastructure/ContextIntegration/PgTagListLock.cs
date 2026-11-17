using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// PostgreSQL adapter of <see cref="ITagListLock"/> (ADR 0033): a transaction-level advisory lock on the list of tags, shared or
/// exclusive. Inside a transaction already open (the reservation of a couple of poses, taken first), it only takes the lock;
/// otherwise it opens one, committed only when the work succeeds.
/// </summary>
public sealed class PgTagListLock(AcroFunJamDbContext context) : ITagListLock
{
    /// <summary>The key of the lock, apart from those of the reservations (« transition-poses: … », names of poses).</summary>
    private const string LockKey = "tag-list";

    public Task<Result<T>> Shared<T>(Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct) =>
        RunLocked(shared: true, work, ct);

    public Task<Result<T>> Exclusive<T>(Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct) =>
        RunLocked(shared: false, work, ct);

    private async Task<Result<T>> RunLocked<T>(bool shared, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(work);
        if (context.Database.CurrentTransaction is not null)
        {
            await Lock(shared, ct);
            return await work(ct);
        }

        await using var transaction = await context.Database.BeginTransactionAsync(ct);
        await Lock(shared, ct);
        var result = await work(ct);
        if (result.IsSuccess) await transaction.CommitAsync(ct);
        else context.ChangeTracker.Clear(); // nothing of the rolled-back work may be saved later in the scope
        return result;
    }

    private Task<int> Lock(bool shared, CancellationToken ct) =>
        shared ? TakeShared(context, ct) : context.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock(hashtextextended({LockKey}, 0))", ct);

    /// <summary>Takes the lock shared in the current transaction (the reservation of a couple of poses, ADR 0033).</summary>
    internal static Task<int> TakeShared(AcroFunJamDbContext context, CancellationToken ct) =>
        context.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock_shared(hashtextextended({LockKey}, 0))", ct);
}
