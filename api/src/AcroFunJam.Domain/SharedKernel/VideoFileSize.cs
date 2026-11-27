using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>The weight of the file of a video as sent (story 12, V5, Q293): 100 MiB at most.</summary>
public sealed record VideoFileSize
{
    /// <summary>100 MiB (ADR 0041).</summary>
    public const long MaxBytes = 100L * 1024 * 1024;

    public long Bytes { get; }

    private VideoFileSize(long bytes) => Bytes = bytes;

    /// <summary>No byte is no file.</summary>
    public static Result<VideoFileSize> Create(long bytes)
    {
        if (bytes <= 0) return VideoContentErrors.FileRequired;
        if (bytes > MaxBytes) return VideoContentErrors.TooLarge;
        return Result<VideoFileSize>.Success(new VideoFileSize(bytes));
    }
}
