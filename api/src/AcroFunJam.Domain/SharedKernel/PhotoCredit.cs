using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The credit of a photo (story 10, R8, Q252): the person who took it, shown as « Photo : Léa Martin ». A pseudonym or a
/// collective is accepted; a stand-in for an unknown author is not, since nobody could then have authorised the publication.
/// </summary>
public sealed record PhotoCredit
{
    public string Value { get; }

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
        "anonyme", "unknown", "anonymous",
    };

    private PhotoCredit(string value) => Value = value;

    /// <summary>NFC, without superfluous spaces; without letter or digit, it names nobody.</summary>
    public static Result<PhotoCredit> Create(string? raw)
    {
        var credit = NameText.Normalize(raw);
        var key = PoseNameKey.Compute(credit);
        if (key.Length == 0) return PhotoContentErrors.CreditRequired;
        if (NotAnAuthor.Contains(key)) return PhotoContentErrors.CreditNotAnAuthor;
        if (NameText.IsLongerThan(credit, MaxLength)) return PhotoContentErrors.CreditTooLong;
        return Result<PhotoCredit>.Success(new PhotoCredit(credit));
    }
}
