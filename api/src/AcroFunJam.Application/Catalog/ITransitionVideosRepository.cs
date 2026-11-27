using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>Port: stores the videos of the transitions (saved by <see cref="Common.IUnitOfWork"/>, story 12, ADR 0041).</summary>
public interface ITransitionVideosRepository
{
    /// <summary>The videos of this transition; none yet gives an aggregate without video.</summary>
    Task<TransitionVideos> GetFor(TransitionId transition, CancellationToken ct);

    /// <summary>The videos of each of these transitions that has some.</summary>
    Task<IReadOnlyDictionary<TransitionId, TransitionVideos>> GetFor(IReadOnlyCollection<TransitionId> transitions, CancellationToken ct);

    /// <summary>The videos of the transition this video is one of, for a reading; none when it is one of no transition (removed).</summary>
    Task<TransitionVideos?> FindByVideo(VideoId video, CancellationToken ct);

    /// <summary>Adds, updates or deletes the videos of a transition.</summary>
    void Save(TransitionVideos videos);
}
