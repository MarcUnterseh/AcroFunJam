namespace AcroFunJam.Domain.SharedKernel;

/// <summary>The size of a video in pixels, once turned upright (story 12, V7, V9).</summary>
public sealed record VideoDimensions(int Width, int Height)
{
    /// <summary>The shorter side of a video has at least this many pixels (V7, Q295): no maximum.</summary>
    public const int MinShortSide = 480;

    /// <summary>The shorter side of a presented video has at most this many pixels (V9, Q296).</summary>
    public const int MaxPresentedShortSide = 720;

    public bool IsLargeEnough => Math.Min(Width, Height) >= MinShortSide;

    public bool IsPortrait => Height > Width;

    /// <summary>
    /// The dimensions the video is presented in: 720 px at most on the shorter side, never enlarged, the ratio kept (V9). The
    /// adapter may round them down to even values, a technical constraint of its format (ADR 0041).
    /// </summary>
    public VideoDimensions Presented()
    {
        var shortSide = Math.Min(Width, Height);
        if (shortSide <= MaxPresentedShortSide) return this;

        var longSide = (int)Math.Round((double)Math.Max(Width, Height) * MaxPresentedShortSide / shortSide, MidpointRounding.AwayFromZero);
        return Width <= Height ? new VideoDimensions(MaxPresentedShortSide, longSide) : new VideoDimensions(longSide, MaxPresentedShortSide);
    }
}
