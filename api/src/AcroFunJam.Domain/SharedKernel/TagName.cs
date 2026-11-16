using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The name of a tag of the catalog (e.g. "pop"), a term of the community without translation (story 8, Q128, Q141,
/// ADR 0032): the rules of a pose name, 30 characters at most.
/// </summary>
public sealed record TagName
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 30;

    private TagName(string value) => Value = value;

    /// <summary>Missing or made only of spaces is no name; made only of punctuation or symbols, it has no letter or digit.</summary>
    public static Result<TagName> Create(string? raw)
    {
        var name = NameText.Normalize(raw);
        if (name.Length == 0) return TagContentErrors.NameRequired;
        if (PoseNameKey.Compute(name).Length == 0) return TagContentErrors.NameWithoutLetterOrDigit;
        if (NameText.IsLongerThan(name, MaxLength)) return TagContentErrors.NameTooLong;
        return Result<TagName>.Success(new TagName(name));
    }

    public TagNameKey Key => TagNameKey.From(this);

    /// <summary>The catalog order of the pose names (ADR 0017): the comparison key, then the exact spelling (Q130).</summary>
    public static IComparer<TagName> CatalogOrder { get; } = Comparer<TagName>.Create(CompareInCatalogOrder);

    private static int CompareInCatalogOrder(TagName? left, TagName? right)
    {
        if (ReferenceEquals(left, right)) return 0;
        if (left is null) return -1;
        if (right is null) return 1;

        return NameText.CompareInCatalogOrder(left.Key.Value, left.Value, right.Key.Value, right.Value);
    }
}
