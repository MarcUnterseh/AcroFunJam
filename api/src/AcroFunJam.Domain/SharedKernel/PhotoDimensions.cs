namespace AcroFunJam.Domain.SharedKernel;

/// <summary>The size of a photo in pixels, once turned upright (story 10, R6, R10).</summary>
public sealed record PhotoDimensions(int Width, int Height)
{
    /// <summary>The shorter side of a photo has at least this many pixels (R6, Q256): no maximum.</summary>
    public const int MinShortSide = 800;

    public bool IsLargeEnough => Math.Min(Width, Height) >= MinShortSide;
}
