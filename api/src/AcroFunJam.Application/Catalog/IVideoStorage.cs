using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// Port (ADR 0041): stores the files of the videos in the object storage of the photos. The original file waits there, under a
/// private prefix, for its preparation, and is deleted once the preparation is finished or impossible; the prepared video and its
/// poster are then served, partially when asked (<see cref="Open"/>).
/// </summary>
public interface IVideoStorage
{
    Task StoreOriginal(VideoId video, string path, CancellationToken ct);

    /// <summary>A local copy of the original file, for its preparation; none when it is not stored.</summary>
    Task<TemporaryVideoFile?> FetchOriginal(VideoId video, CancellationToken ct);

    Task StorePrepared(VideoId video, PreparedVideoFiles files, CancellationToken ct);

    /// <summary>
    /// A prepared file, or the asked range of it (a partial read in the storage), with its total length; none when it is not
    /// stored.
    /// </summary>
    Task<VideoContent?> Open(VideoId video, VideoRendition rendition, ByteRange? range, CancellationToken ct);

    /// <summary>Deletes the original file, at best: a failure is logged by the adapter, never thrown.</summary>
    Task DeleteOriginal(VideoId video, CancellationToken ct);

    /// <summary>Deletes every file of a video (original and prepared), at best: a failure is logged by the adapter, never thrown.</summary>
    Task Delete(VideoId video, CancellationToken ct);
}

/// <summary>The prepared files of a video (ADR 0041).</summary>
public enum VideoRendition
{
    /// <summary>The prepared video, MP4 H.264.</summary>
    Video,

    /// <summary>Its first image, WebP: the poster.</summary>
    Poster,
}

/// <summary>
/// A single range of bytes, as a <c>Range</c> header asks it (ADR 0041): <c>bytes=a-b</c>, <c>bytes=a-</c> (from a to the end) or
/// <c>bytes=-n</c> (the last n bytes). The storage serves it.
/// </summary>
public sealed record ByteRange(long? From, long? To);

/// <summary>
/// What the storage gives for a prepared file: its content (the whole file, or the asked range), its total length, and the range
/// served (<c>null</c> for the whole file). An asked range outside the file gives no content.
/// </summary>
public sealed record VideoContent(Stream? Content, long TotalLength, (long First, long Last)? Range)
{
    public bool IsRangeNotSatisfiable => Content is null;

    public static VideoContent RangeNotSatisfiable(long totalLength) => new(null, totalLength, null);
}
