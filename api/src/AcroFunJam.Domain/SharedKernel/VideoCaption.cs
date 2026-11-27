using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The caption of a video (story 12, V12, Q231): what the video shows, and whether it is a demonstration or a tutorial; the
/// accessible name of the player. Mandatory, without superfluous spaces, 100 characters at most.
/// </summary>
public sealed record VideoCaption
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 100;

    private VideoCaption(string value) => Value = value;

    public static Result<VideoCaption> Create(string? raw)
    {
        var caption = NameText.Normalize(raw);
        if (caption.Length == 0) return VideoContentErrors.CaptionRequired;
        if (NameText.IsLongerThan(caption, MaxLength)) return VideoContentErrors.CaptionTooLong;
        return Result<VideoCaption>.Success(new VideoCaption(caption));
    }
}
