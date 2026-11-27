using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The optional description of a video (story 12, V23, decision 6): the movement, for whoever does not see the video, without
/// naming the people filmed. Without superfluous spaces, 300 characters at most; missing or only spaces is no description.
/// </summary>
public sealed record VideoDescription
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 300;

    private VideoDescription(string value) => Value = value;

    public static Result<VideoDescription?> Create(string? raw)
    {
        var description = NameText.Normalize(raw);
        if (description.Length == 0) return Result<VideoDescription?>.Success(null);
        if (NameText.IsLongerThan(description, MaxLength)) return VideoContentErrors.DescriptionTooLong;
        return Result<VideoDescription?>.Success(new VideoDescription(description));
    }
}
