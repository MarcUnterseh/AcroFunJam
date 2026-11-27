using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// Port (ADR 0041): runs a change of the videos of a transition under the lock <c>transition-videos:&lt;id&gt;</c> (read, decide,
/// save), so that two additions never exceed 3 videos together. Never taken with another lock.
/// </summary>
public interface ITransitionVideosLock
{
    Task<Result<T>> Run<T>(TransitionId transition, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct);
}
