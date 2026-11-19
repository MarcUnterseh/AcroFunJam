using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Infrastructure.Persistence;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// PostgreSQL adapter of <see cref="IPoseTaggingLock"/> (ADR 0036): the lock of the published pose, the same as the reservation of
/// a revision of Contribution (« pose: … », ADR 0025), so that no revision is submitted while the pose is tagged; then the lock of
/// the list of tags, shared (ADR 0033).
/// </summary>
public sealed class PgPoseTaggingLock(AcroFunJamDbContext context) : IPoseTaggingLock
{
    public Task<Result<T>> Run<T>(PoseId pose, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(work);
        return AdvisoryLocks.RunLocked(context, [PgPoseReservation.PoseLockKey(pose.Value)], async lockedCt =>
        {
            await PgTagListLock.TakeShared(context, lockedCt);
            return await work(lockedCt);
        }, ct);
    }
}
