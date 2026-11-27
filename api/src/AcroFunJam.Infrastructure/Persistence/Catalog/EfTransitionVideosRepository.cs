using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>
/// EF Core adapter of <see cref="ITransitionVideosRepository"/> (ADR 0041): one row per video. A save inserts the videos read
/// nowhere, updates the others and deletes the removed ones (their preparation job goes by the cascade); the lock
/// <c>transition-videos</c> serialises the writers.
/// </summary>
public sealed class EfTransitionVideosRepository(AcroFunJamDbContext context, TrackedAggregates aggregates) : ITransitionVideosRepository
{
    /// <summary>The videos of each transition as last read: a later read replaces the snapshot (a video removed meanwhile is gone).</summary>
    private readonly Dictionary<TransitionId, HashSet<VideoId>> _stored = [];

    public async Task<TransitionVideos> GetFor(TransitionId transition, CancellationToken ct)
    {
        var records = await context.Set<VideoRecord>().AsNoTracking().Where(v => v.TransitionId == transition.Value).ToListAsync(ct);
        var videos = TransitionVideos.Rehydrate(transition, records.Select(ToVideo));
        _stored[transition] = [.. records.Select(r => new VideoId(r.Id))];
        aggregates.Track(videos);
        return videos;
    }

    public async Task<IReadOnlyDictionary<TransitionId, TransitionVideos>> GetFor(IReadOnlyCollection<TransitionId> transitions, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(transitions);
        var ids = transitions.Select(t => t.Value).ToList();
        var records = await context.Set<VideoRecord>().AsNoTracking().Where(v => ids.Contains(v.TransitionId)).ToListAsync(ct);
        return records.GroupBy(r => r.TransitionId).ToDictionary(
            g => new TransitionId(g.Key),
            g => TransitionVideos.Rehydrate(new TransitionId(g.Key), g.Select(ToVideo)));
    }

    public async Task<TransitionVideos?> FindByVideo(VideoId video, CancellationToken ct)
    {
        var videos = context.Set<VideoRecord>().AsNoTracking();
        var records = await videos
            .Where(v => videos.Any(found => found.Id == video.Value && found.TransitionId == v.TransitionId))
            .ToListAsync(ct);
        return records.Count == 0 ? null : TransitionVideos.Rehydrate(new TransitionId(records[0].TransitionId), records.Select(ToVideo));
    }

    public void Save(TransitionVideos videos)
    {
        ArgumentNullException.ThrowIfNull(videos);
        var current = videos.InAdditionOrder();
        if (!_stored.TryGetValue(videos.Id, out var stored)) _stored[videos.Id] = stored = [];
        foreach (var video in current)
        {
            if (stored.Add(video.Id))
            {
                context.Set<VideoRecord>().Add(ToRecord(videos.Id, video));
                continue;
            }

            var entry = context.Set<VideoRecord>().Attach(ToRecord(videos.Id, video));
            entry.Property(v => v.Caption).IsModified = true;
            entry.Property(v => v.Credit).IsModified = true;
            entry.Property(v => v.Description).IsModified = true;
            entry.Property(v => v.Width).IsModified = true;
            entry.Property(v => v.Height).IsModified = true;
            entry.Property(v => v.DurationMs).IsModified = true;
            entry.Property(v => v.Preparation).IsModified = true;
        }

        foreach (var removed in stored.Except(current.Select(v => v.Id)).ToList())
        {
            context.Set<VideoRecord>().Remove(new VideoRecord { Id = removed.Value, Caption = string.Empty, Credit = string.Empty, Preparation = string.Empty });
            stored.Remove(removed);
        }

        aggregates.Track(videos);
    }

    private const string Ready = "ready";

    /// <summary>The codes of the preparation, as stored (the same as the HTTP contract, ADR 0041).</summary>
    private static string CodeOf(VideoPreparation preparation) => preparation switch
    {
        VideoPreparation.InPreparation => "in-preparation",
        VideoPreparation.Ready => Ready,
        VideoPreparation.Failed => "failed",
        _ => throw new ArgumentOutOfRangeException(nameof(preparation), preparation, "Unknown preparation."),
    };

    private static VideoPreparation PreparationOf(VideoRecord record) => record.Preparation switch
    {
        "in-preparation" => VideoPreparation.InPreparation,
        Ready => VideoPreparation.Ready,
        "failed" => VideoPreparation.Failed,
        _ => throw Invalid(record, "preparation"),
    };

    private static VideoRecord ToRecord(TransitionId transition, Video video) => new()
    {
        Id = video.Id.Value,
        TransitionId = transition.Value,
        Caption = video.Caption.Value,
        Credit = video.Credit.Value,
        Description = video.Description?.Value,
        Width = video.Dimensions.Width,
        Height = video.Dimensions.Height,
        DurationMs = video.Duration.Milliseconds,
        Preparation = CodeOf(video.Preparation),
        AdditionRank = video.AdditionRank,
        AddedAt = video.AddedAt,
        RightsConfirmedBy = video.Rights.ConfirmedBy.Value,
        RightsConfirmedAt = video.Rights.ConfirmedAt,
    };

    // Stored data always met the rules when written: breaking them now is a bug.
    private static Video ToVideo(VideoRecord record) =>
        Video.Rehydrate(
            new VideoId(record.Id),
            VideoCaption.Create(record.Caption).Value ?? throw Invalid(record, "caption"),
            VideoCredit.Create(record.Credit).Value ?? throw Invalid(record, "credit"),
            StoredDescription(record),
            new VideoDimensions(record.Width, record.Height),
            VideoDuration.FromMilliseconds(record.DurationMs),
            PreparationOf(record),
            new RightsConfirmation(new CatalogManagerId(record.RightsConfirmedBy), record.RightsConfirmedAt),
            record.AdditionRank,
            record.AddedAt);

    private static VideoDescription? StoredDescription(VideoRecord record)
    {
        var description = VideoDescription.Create(record.Description);
        return description.IsSuccess ? description.Value : throw Invalid(record, "description");
    }

    private static InvalidOperationException Invalid(VideoRecord record, string what) => new($"Invalid stored {what} of the video {record.Id}.");
}
