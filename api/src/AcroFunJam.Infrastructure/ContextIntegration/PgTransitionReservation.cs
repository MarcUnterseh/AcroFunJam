using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Infrastructure.Persistence;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// PostgreSQL adapter of <see cref="ITransitionReservation"/> (ADR 0029): one transaction, serialised per oriented couple of poses
/// by a transaction-level advisory lock, committed only when the work succeeds. It spans the places taken by the published
/// transitions of the Catalog and the pending proposals of Contribution, hence its place among the context integration adapters.
/// </summary>
public sealed class PgTransitionReservation(AcroFunJamDbContext context) : ITransitionReservation
{
    /// <summary>Namespace of the advisory lock keys, so that another kind of lock never collides with a couple of poses.</summary>
    private const string LockKeyPrefix = "transition-poses:";

    public Task<Result<T>> Run<T>(TransitionPoses poses, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(poses);
        // Then the list of tags, shared (ADR 0033): the tags chosen inside are never removed meanwhile; a removal waits.
        return AdvisoryLocks.RunLocked(
            context, [$"{LockKeyPrefix}{poses.From.Value}:{poses.To.Value}"],
            async lockedCt =>
            {
                await PgTagListLock.TakeShared(context, lockedCt);
                return await work(lockedCt);
            },
            ct);
    }
}
