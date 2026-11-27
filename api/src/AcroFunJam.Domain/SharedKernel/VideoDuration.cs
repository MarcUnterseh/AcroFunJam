namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The duration of a video (story 12, V6, decision 7): from 2 seconds to less than 31 seconds (30,9 s accepted), refused beyond,
/// never cut. The seconds said in a message are truncated.
/// </summary>
public sealed record VideoDuration
{
    public const int MinSeconds = 2;

    /// <summary>A video lasts less than this (31 s: refused).</summary>
    public const int MaxSecondsExclusive = 31;

    /// <summary>« 30 secondes au plus », as the messages say it.</summary>
    public const int MaxSecondsSaid = MaxSecondsExclusive - 1;

    /// <summary>
    /// How much a decoded duration may exceed the limit before the preparation declares the video impossible to prepare (ADR 0041):
    /// a file that lied at the demultiplexing is never presented.
    /// </summary>
    public const long ToleranceMilliseconds = 500;

    public long Milliseconds { get; }

    private VideoDuration(long milliseconds) => Milliseconds = milliseconds;

    public static VideoDuration FromMilliseconds(long milliseconds) => new(Math.Max(0, milliseconds));

    /// <summary>The whole seconds, truncated (31,7 s: 31).</summary>
    public int TruncatedSeconds => (int)(Milliseconds / 1000);

    public bool IsTooShort => Milliseconds < MinSeconds * 1000L;

    public bool IsTooLong => Milliseconds >= MaxSecondsExclusive * 1000L;

    public bool ExceedsTheLimitByMoreThanTheTolerance => Milliseconds >= (MaxSecondsExclusive * 1000L) + ToleranceMilliseconds;
}
