using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>The weight of the file of a photo as sent (story 10, R5, Q255): 10 MiB at most.</summary>
public sealed record PhotoFileSize
{
    /// <summary>10 MiB (ADR 0039).</summary>
    public const long MaxBytes = 10 * 1024 * 1024;

    public long Bytes { get; }

    private PhotoFileSize(long bytes) => Bytes = bytes;

    /// <summary>No byte is no file.</summary>
    public static Result<PhotoFileSize> Create(long bytes)
    {
        if (bytes <= 0) return PhotoContentErrors.FileRequired;
        if (bytes > MaxBytes) return PhotoContentErrors.TooLarge;
        return Result<PhotoFileSize>.Success(new PhotoFileSize(bytes));
    }
}
