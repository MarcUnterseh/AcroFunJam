using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Infrastructure.Persistence;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// PostgreSQL adapter of <see cref="ITransitionVideosLock"/> (ADR 0041): a transaction-level advisory lock « transition-videos: … »,
/// distinct from the reservation of the place of a transition (« transition-poses: … », ADR 0029) and from the list of the tags.
/// </summary>
public sealed class PgTransitionVideosLock(AcroFunJamDbContext context) : ITransitionVideosLock
{
    private const string LockKeyPrefix = "transition-videos:";

    public Task<Result<T>> Run<T>(TransitionId transition, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct) =>
        AdvisoryLocks.RunLocked(context, [LockKeyPrefix + transition.Value], work, ct);
}
