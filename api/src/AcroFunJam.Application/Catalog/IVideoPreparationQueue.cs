using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// Port (ADR 0041): the queue of the preparations, a table claimed by lease. A job is added in the transaction that adds the video
/// (<see cref="Enqueue"/>, saved by <see cref="Common.IUnitOfWork"/>), and removed in the one that records its outcome
/// (<see cref="Complete"/>); a removed video takes its job away. A job whose lease expired (a worker stopped) is claimed again.
/// </summary>
[System.Diagnostics.CodeAnalysis.SuppressMessage("Naming", "CA1711", Justification = "The name of the ADR 0041: a queue of jobs, not a collection.")]
public interface IVideoPreparationQueue
{
    void Enqueue(VideoId video, TransitionId transition, DateTimeOffset at);

    /// <summary>
    /// Claims the oldest job without a running lease, in a short transaction of its own: gives it a lease and counts an attempt.
    /// None when there is nothing to prepare.
    /// </summary>
    Task<VideoPreparationJob?> Claim(CancellationToken ct);

    void Complete(VideoId video);

    /// <summary>
    /// Gives a claimed job back at once, in a short transaction of its own, without counting its attempt: the worker stopped
    /// during the preparation (ADR 0041).
    /// </summary>
    Task Release(VideoId video, CancellationToken ct);
}

/// <summary>A preparation to do, and how many times it was claimed, this one included.</summary>
public sealed record VideoPreparationJob(VideoId Video, TransitionId Transition, int Attempts);
