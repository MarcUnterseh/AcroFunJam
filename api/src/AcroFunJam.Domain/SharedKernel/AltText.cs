using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The alternative text of a photo (story 10, R7, Q251): what the base and the flyer do, for whoever does not see the photo.
/// Optional since the revision of 2026-11-26: a photo may have none (the site then describes it by its pose and rank). Never
/// shown as a caption.
/// </summary>
public sealed record AltText
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 200;

    private AltText(string value) => Value = value;

    /// <summary>
    /// NFC, without superfluous spaces (a line break counts as a space). Missing, or only spaces: no alternative text
    /// (<c>null</c>).
    /// </summary>
    public static Result<AltText?> Create(string? raw)
    {
        var text = NameText.Normalize(raw);
        if (text.Length == 0) return Result<AltText?>.Success(null);
        if (NameText.IsLongerThan(text, MaxLength)) return PhotoContentErrors.AltTextTooLong;
        return Result<AltText?>.Success(new AltText(text));
    }
}
