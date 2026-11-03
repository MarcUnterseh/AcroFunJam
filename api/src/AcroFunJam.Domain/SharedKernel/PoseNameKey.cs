using System.Globalization;
using System.Text;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// Comparison key of a pose name, shared by its uniqueness and the catalog order (ADR 0017). Never displayed.
/// </summary>
public sealed record PoseNameKey
{
    public string Value { get; }

    private PoseNameKey(string value) => Value = value;

    public static PoseNameKey From(PoseName name)
    {
        ArgumentNullException.ThrowIfNull(name);
        return new PoseNameKey(Compute(name.Value));
    }

    /// <summary>
    /// Without accents (NFD, diacritical marks removed), every code point that is neither a letter nor a digit
    /// counting as a space, spaces collapsed and trimmed, in lower case.
    /// </summary>
    internal static string Compute(string name)
    {
        var key = new StringBuilder(name.Length);
        foreach (var rune in name.Normalize(NormalizationForm.FormD).EnumerateRunes())
        {
            if (Rune.GetUnicodeCategory(rune) == UnicodeCategory.NonSpacingMark) continue;
            if (Rune.IsLetterOrDigit(rune)) key.Append(rune.ToString());
            else key.Append(' ');
        }

        return string.Join(' ', key.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries)).ToLowerInvariant();
    }
}
