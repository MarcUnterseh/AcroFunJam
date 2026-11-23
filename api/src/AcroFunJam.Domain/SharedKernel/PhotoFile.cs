using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The file of a photo as found by the processing (story 10, R4 to R6): the processing only finds the format and the
/// dimensions; the domain decides whether the file is accepted.
/// </summary>
public sealed record PhotoFile
{
    public PhotoFormat Format { get; }
    public PhotoFileSize Size { get; }
    public PhotoDimensions Dimensions { get; }

    private PhotoFile(PhotoFormat format, PhotoFileSize size, PhotoDimensions dimensions)
    {
        Format = format;
        Size = size;
        Dimensions = dimensions;
    }

    /// <param name="format">The format recognised from the content; none when it is not an accepted one.</param>
    /// <param name="dimensions">The dimensions once turned upright; none when the photo could not be read.</param>
    public static Result<PhotoFile> Accept(PhotoFormat? format, PhotoFileSize size, PhotoDimensions? dimensions)
    {
        ArgumentNullException.ThrowIfNull(size);
        if (format is not { } accepted) return PhotoContentErrors.FormatNotAccepted;
        if (dimensions is null) return PhotoContentErrors.Unreadable;
        if (!dimensions.IsLargeEnough) return PhotoContentErrors.TooSmall;
        return Result<PhotoFile>.Success(new PhotoFile(accepted, size, dimensions));
    }
}
