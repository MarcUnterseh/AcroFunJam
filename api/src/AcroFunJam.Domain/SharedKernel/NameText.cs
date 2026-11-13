using System.Text;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>The normalisation shared by the names of the catalog, poses and transitions (ADR 0017, ADR 0028).</summary>
internal static class NameText
{
    /// <summary>As typed (NFC, so that an accent counts as one character), without superfluous spaces.</summary>
    public static string Normalize(string? raw) =>
        string.Join(' ', (raw ?? string.Empty).Normalize(NormalizationForm.FormC).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    /// <summary>Counted in code points, as PostgreSQL char_length and the site do (ADR 0017).</summary>
    public static bool IsLongerThan(string text, int maxLength) => text.EnumerateRunes().Count() > maxLength;
}
