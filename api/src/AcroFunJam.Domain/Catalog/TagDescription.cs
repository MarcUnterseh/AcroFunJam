using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// What a tag means, in a short sentence, ideally with an example (story 8, Q129, Q144, Q153, ADR 0032): mandatory, so that
/// everybody tags the same way. Only the Catalog knows it.
/// </summary>
public sealed record TagDescription
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = TagContentErrors.DescriptionMaxLength;

    private TagDescription(string value) => Value = value;

    /// <summary>NFC, without superfluous spaces (leading, trailing or consecutive; a line break counts as a space).</summary>
    public static Result<TagDescription> Create(string? raw)
    {
        var description = NameText.Normalize(raw);
        if (description.Length == 0) return TagContentErrors.DescriptionRequired;
        if (NameText.IsLongerThan(description, MaxLength)) return TagContentErrors.DescriptionTooLong;
        return Result<TagDescription>.Success(new TagDescription(description));
    }
}
