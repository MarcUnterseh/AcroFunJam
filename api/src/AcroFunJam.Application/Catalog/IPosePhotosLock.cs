using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// Port (ADR 0039): runs a change of the photos of a pose under the lock <c>pose-photos:&lt;id&gt;</c>, so that two additions
/// never exceed 5 photos together. Independent of the lock of the pose: a photo is added while a revision is pending (R15).
/// </summary>
public interface IPosePhotosLock
{
    Task<Result<T>> Run<T>(PoseId pose, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct);
}
