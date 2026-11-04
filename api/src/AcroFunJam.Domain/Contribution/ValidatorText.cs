namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The free text a validator writes for a contributor (<see cref="RejectionReason"/>, <see cref="AdjustmentNote"/>):
/// same normalisation and same way of counting its length (ADR 0022).
/// </summary>
internal static class ValidatorText
{
    /// <summary>Without superfluous spaces: leading, trailing or consecutive (a line break counts as a space).</summary>
    public static string Normalize(string? raw) =>
        string.Join(' ', (raw ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    /// <summary>Counted in code points, as PostgreSQL char_length and the site do (ADR 0017).</summary>
    public static bool IsLongerThan(string text, int maxLength) => text.EnumerateRunes().Count() > maxLength;
}
