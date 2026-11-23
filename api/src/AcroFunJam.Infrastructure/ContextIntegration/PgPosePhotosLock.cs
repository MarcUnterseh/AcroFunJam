using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Infrastructure.Persistence;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// PostgreSQL adapter of <see cref="IPosePhotosLock"/> (ADR 0039): a transaction-level advisory lock « pose-photos: … », distinct
/// from the lock of the pose (« pose: … »), so that a photo is added while a revision of the pose is submitted (R15).
/// </summary>
public sealed class PgPosePhotosLock(AcroFunJamDbContext context) : IPosePhotosLock
{
    private const string LockKeyPrefix = "pose-photos:";

    public Task<Result<T>> Run<T>(PoseId pose, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct) =>
        AdvisoryLocks.RunLocked(context, [LockKeyPrefix + pose.Value], work, ct);
}
