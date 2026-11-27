namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Persistence shape of a video of a transition (table catalog.videos, ADR 0041); a removed video is deleted.</summary>
public sealed class VideoRecord
{
    public Guid Id { get; set; }

    public Guid TransitionId { get; set; }

    public required string Caption { get; set; }

    public required string Credit { get; set; }

    /// <summary>None when the video has no description (V23).</summary>
    public string? Description { get; set; }

    /// <summary>Presented dimensions: planned while in preparation, then those of the prepared video.</summary>
    public int Width { get; set; }

    public int Height { get; set; }

    public long DurationMs { get; set; }

    /// <summary><c>in-preparation</c>, <c>ready</c> or <c>failed</c>.</summary>
    public required string Preparation { get; set; }

    public int AdditionRank { get; set; }

    public DateTimeOffset AddedAt { get; set; }

    /// <summary>The account that confirmed the rights (ADR 0041: kept after the account is deleted, never shown).</summary>
    public Guid RightsConfirmedBy { get; set; }

    public DateTimeOffset RightsConfirmedAt { get; set; }
}

/// <summary>
/// Persistence shape of a preparation to do (table catalog.video_preparation_jobs, ADR 0041): claimed by lease, removed with the
/// outcome of the preparation, or with its video.
/// </summary>
public sealed class VideoPreparationJobRecord
{
    public Guid VideoId { get; set; }

    public Guid TransitionId { get; set; }

    public DateTimeOffset EnqueuedAt { get; set; }

    /// <summary>How many times the job was claimed.</summary>
    public int Attempts { get; set; }

    /// <summary>Until when a worker holds the job; none when it was never claimed.</summary>
    public DateTimeOffset? LeaseUntil { get; set; }
}
