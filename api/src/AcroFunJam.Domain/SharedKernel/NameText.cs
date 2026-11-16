using System.Text;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The normalisation shared by the names of the catalog, poses, transitions and tags, and by the description of a tag (ADR 0017,
/// ADR 0028, ADR 0032).
/// </summary>
internal static class NameText
{
    /// <summary>As typed (NFC, so that an accent counts as one character), without superfluous spaces.</summary>
    public static string Normalize(string? raw) =>
        string.Join(' ', (raw ?? string.Empty).Normalize(NormalizationForm.FormC).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    /// <summary>Counted in code points, as PostgreSQL char_length and the site do (ADR 0017).</summary>
    public static bool IsLongerThan(string text, int maxLength) => text.EnumerateRunes().Count() > maxLength;

    /// <summary>
    /// Catalog order of the names (ADR 0017): the comparison key in ordinal order; equivalent names are then ordered by their
    /// exact spelling so that the order is deterministic.
    /// </summary>
    public static int CompareInCatalogOrder(string leftKey, string left, string rightKey, string right)
    {
        var byKey = string.CompareOrdinal(leftKey, rightKey);
        return byKey != 0 ? byKey : string.CompareOrdinal(left, right);
    }
}
