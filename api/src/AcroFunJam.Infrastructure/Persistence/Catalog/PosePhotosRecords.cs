namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Persistence shape of the photos of a pose (table catalog.pose_photos, ADR 0039): its main photo.</summary>
public sealed class PosePhotosRecord
{
    public Guid PoseId { get; set; }

    /// <summary>The main photo; none when the pose has no photo any more.</summary>
    public Guid? MainPhotoId { get; set; }
}

/// <summary>Persistence shape of a photo of a pose (table catalog.photos, ADR 0039); a removed photo is deleted.</summary>
public sealed class PhotoRecord
{
    public Guid Id { get; set; }

    public Guid PoseId { get; set; }

    /// <summary>None when the photo has no alternative text (revision of 2026-11-26).</summary>
    public string? AltText { get; set; }

    public required string Credit { get; set; }

    /// <summary>Upright dimensions of the photo as sent.</summary>
    public int Width { get; set; }

    public int Height { get; set; }

    public int AdditionRank { get; set; }

    public DateTimeOffset AddedAt { get; set; }

    /// <summary>The account that confirmed the rights (ADR 0039: kept after the account is deleted, never shown).</summary>
    public Guid RightsConfirmedBy { get; set; }

    public DateTimeOffset RightsConfirmedAt { get; set; }
}
