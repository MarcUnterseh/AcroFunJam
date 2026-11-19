using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// Port (ADR 0036): runs the direct tagging of a pose under the lock of the pose shared with Contribution (no revision of the
/// pose is submitted meanwhile), then the lock of the list of tags, shared (no tag of the choice is removed meanwhile).
/// </summary>
public interface IPoseTaggingLock
{
    Task<Result<T>> Run<T>(PoseId pose, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct);
}
