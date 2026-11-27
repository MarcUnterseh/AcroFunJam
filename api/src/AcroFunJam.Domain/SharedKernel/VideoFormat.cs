namespace AcroFunJam.Domain.SharedKernel;

/// <summary>The formats a video is accepted in (story 12, V4, Q292), recognised from the content of the file, never from its name.</summary>
public enum VideoFormat
{
    Mp4,

    /// <summary>MOV, the videos of the iPhones.</summary>
    QuickTime,

    WebM,
}
