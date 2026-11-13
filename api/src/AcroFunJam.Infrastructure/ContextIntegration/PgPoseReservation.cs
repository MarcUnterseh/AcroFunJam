using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Persistence;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// PostgreSQL adapter of <see cref="IPoseReservation"/> (ADR 0017, ADR 0025): one transaction, serialised per published pose
/// and per name key by transaction-level advisory locks (the pose first, then the name), committed only when the work succeeds.
/// It spans the poses and names of both the Catalog and Contribution, hence its place among the context integration adapters.
/// The violations of the unique indexes are translated by the unit of work of each context (<see cref="UniqueConstraintError"/>).
/// </summary>
public sealed class PgPoseReservation(AcroFunJamDbContext context) : IPoseReservation
{
    /// <summary>Namespace of the advisory lock keys, so that another kind of lock never collides with a pose name.</summary>
    private const string LockKeyPrefix = "pose-name:";

    /// <summary>Namespace of the advisory lock keys of the published poses (ADR 0025).</summary>
    private const string PoseLockKeyPrefix = "pose:";

    public Task<Result<T>> Run<T>(PoseNameKey key, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(key);
        return RunLocked([LockKeyPrefix + key.Value], work, ct);
    }

    /// <summary>The pose first, then the name: always in this order, so that two use cases never wait for each other (ADR 0025).</summary>
    public Task<Result<T>> Run<T>(PublishedPoseId pose, PoseNameKey? key, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct) =>
        RunLocked(key is null ? [PoseLockKeyPrefix + pose.Value] : [PoseLockKeyPrefix + pose.Value, LockKeyPrefix + key.Value], work, ct);

    private Task<Result<T>> RunLocked<T>(string[] lockKeys, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct) =>
        AdvisoryLocks.RunLocked(context, lockKeys, work, ct);
}
