namespace AcroFunJam.Application.Catalog;

/// <summary>
/// The range of bytes the fakes of <see cref="IVideoStorage"/> serve from a file held in memory, as the object storage does
/// (shared by the test projects, never by the production code: the storage computes the range itself).
/// </summary>
internal static class ByteRangeInMemory
{
    /// <summary>The first and last byte asked of a file of this length; none when the range is outside the file.</summary>
    public static (long First, long Last)? Within(this ByteRange range, long totalLength)
    {
        if (totalLength <= 0) return null;
        if (range.From is not { } from)
        {
            if (range.To is not { } suffix || suffix <= 0) return null;
            return (Math.Max(0, totalLength - suffix), totalLength - 1);
        }

        if (from >= totalLength || (range.To is { } to && to < from)) return null;
        return (from, Math.Min(range.To ?? (totalLength - 1), totalLength - 1));
    }
}
