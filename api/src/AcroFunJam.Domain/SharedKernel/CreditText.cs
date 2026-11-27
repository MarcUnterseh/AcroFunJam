namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The rule shared by the credit of a photo and of a video (stories 10 and 12, Q252, Q287): who the file belongs to, a person, a
/// duo or a collective, as typed without superfluous spaces, 100 characters at most; a stand-in for an unknown author is refused,
/// since nobody could then have authorised the publication. A rule, not a type: <see cref="PhotoCredit"/> and the credit of a
/// video stay distinct, each with its own errors.
/// </summary>
internal static class CreditText
{
    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 100;

    /// <summary>
    /// The comparison keys (<see cref="PoseNameKey"/>: case, accents and punctuation ignored) that stand in for an unknown
    /// author. The whole key is compared: « Collectif Inconnu Acro » names an author.
    /// </summary>
    private static readonly HashSet<string> NotAnAuthor = new(StringComparer.Ordinal)
    {
        "inconnu", "inconnue",
        "auteur inconnu", "auteure inconnue", "autrice inconnue",
        "photographe inconnu", "photographe inconnue",
        "videaste inconnu", "videaste inconnue",
        "anonyme", "unknown", "anonymous",
    };

    /// <summary>What a typed credit is, once normalised.</summary>
    public enum Verdict
    {
        Accepted,
        Missing,
        NotAnAuthor,
        TooLong,
    }

    /// <summary>NFC, without superfluous spaces; without letter or digit, it names nobody.</summary>
    public static (string Text, Verdict Verdict) Judge(string? raw)
    {
        var credit = NameText.Normalize(raw);
        var key = PoseNameKey.Compute(credit);
        if (key.Length == 0) return (credit, Verdict.Missing);
        if (NotAnAuthor.Contains(key)) return (credit, Verdict.NotAnAuthor);
        if (NameText.IsLongerThan(credit, MaxLength)) return (credit, Verdict.TooLong);
        return (credit, Verdict.Accepted);
    }
}
