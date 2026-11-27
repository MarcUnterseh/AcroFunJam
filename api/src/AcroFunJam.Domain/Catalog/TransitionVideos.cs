using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// The videos of a published transition (story 12, ADR 0041), an aggregate of its own, identified by the transition: adding a video
/// never changes the transition (Q290). 3 videos at most, in preparation included (V15), presented in the order of addition,
/// without a main video; a visitor sees the ready ones only (V11).
/// </summary>
public sealed class TransitionVideos : AggregateRoot<TransitionId>
{
    /// <summary>At most 3 videos per transition (V15, Q232).</summary>
    public const int MaxCount = 3;

    private readonly List<Video> _videos;

    private TransitionVideos(TransitionId transitionId, IEnumerable<Video> videos) : base(transitionId) => _videos = [.. videos];

    /// <summary>The videos of a transition that has none yet.</summary>
    public static TransitionVideos For(TransitionId transitionId) => new(transitionId, []);

    /// <summary>Restores the videos loaded from storage, without raising any event.</summary>
    public static TransitionVideos Rehydrate(TransitionId transitionId, IEnumerable<Video> videos) => new(transitionId, videos);

    /// <summary>The transition has its 3 videos: no other can be added before one is removed (V15).</summary>
    public bool IsFull => _videos.Count >= MaxCount;

    public IReadOnlyList<Video> InAdditionOrder() => [.. _videos.OrderBy(v => v.AdditionRank)];

    /// <summary>The videos this audience sees, in the order of addition: the ready ones for a visitor, all for a manager (V11).</summary>
    public IReadOnlyList<Video> PresentedTo(VideoAudience audience) =>
        [.. InAdditionOrder().Where(v => audience == VideoAudience.Manager || v.IsReady)];

    public Result<Video> Add(
        VideoId id, VideoFile file, VideoCaption caption, VideoCredit credit, VideoDescription? description, RightsConfirmation rights,
        DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(file);
        if (IsFull) return CatalogErrors.VideoLimitReached;

        var rank = _videos.Count == 0 ? 1 : _videos.Max(v => v.AdditionRank) + 1;
        var video = Video.New(id, file, caption, credit, description, rights, rank, now);
        _videos.Add(video);
        Raise(new VideoAdded(Id, id, now));
        return Result<Video>.Success(video);
    }

    /// <summary>
    /// Records a finished preparation (ADR 0041). A video whose decoded duration exceeds the limit by more than half a second lied
    /// at the demultiplexing: it is impossible to prepare. A video no longer in preparation is left as it is.
    /// </summary>
    public Result<Video> MarkPrepared(VideoId id, PreparedVideo prepared, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(prepared);
        if (Find(id) is not { } video) return CatalogErrors.VideoNotFound;
        if (video.Preparation != VideoPreparation.InPreparation) return Result<Video>.Success(video);

        Raise(video.Prepare(prepared) ? new VideoPrepared(Id, id, now) : new VideoPreparationFailed(Id, id, now));
        return Result<Video>.Success(video);
    }

    /// <summary>The file could not be prepared (damaged, or the attempts are exhausted, ADR 0041).</summary>
    public Result<Video> MarkPreparationFailed(VideoId id, DateTimeOffset now)
    {
        if (Find(id) is not { } video) return CatalogErrors.VideoNotFound;
        if (video.Preparation != VideoPreparation.InPreparation) return Result<Video>.Success(video);

        video.FailPreparation();
        Raise(new VideoPreparationFailed(Id, id, now));
        return Result<Video>.Success(video);
    }

    /// <summary>The video is removed at once, whatever its preparation (V16).</summary>
    public Result<Video> Remove(VideoId id, DateTimeOffset now)
    {
        if (Find(id) is not { } video) return CatalogErrors.VideoNotFound;

        _videos.Remove(video);
        Raise(new VideoRemoved(Id, id, now));
        return Result<Video>.Success(video);
    }

    /// <summary>Corrects the caption, the credit and the description; the video keeps its place (V17, V23).</summary>
    public Result<Video> Correct(VideoId id, VideoCaption caption, VideoCredit credit, VideoDescription? description, DateTimeOffset now)
    {
        if (Find(id) is not { } video) return CatalogErrors.VideoNotFound;

        if (video.Correct(caption, credit, description)) Raise(new VideoCorrected(Id, id, now));
        return Result<Video>.Success(video);
    }

    private Video? Find(VideoId id) => _videos.SingleOrDefault(v => v.Id == id);
}
