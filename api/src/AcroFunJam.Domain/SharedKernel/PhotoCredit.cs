using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The credit of a photo (story 10, R8, Q252): the person who took it, shown as « Photo : Léa Martin ». A pseudonym or a
/// collective is accepted; a stand-in for an unknown author is not, since nobody could then have authorised the publication.
/// The rule is <see cref="CreditText"/>, shared with the credit of a video.
/// </summary>
public sealed record PhotoCredit
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = CreditText.MaxLength;

    private PhotoCredit(string value) => Value = value;

    public static Result<PhotoCredit> Create(string? raw)
    {
        var (credit, verdict) = CreditText.Judge(raw);
        return verdict switch
        {
            CreditText.Verdict.Missing => PhotoContentErrors.CreditRequired,
            CreditText.Verdict.NotAnAuthor => PhotoContentErrors.CreditNotAnAuthor,
            CreditText.Verdict.TooLong => PhotoContentErrors.CreditTooLong,
            _ => Result<PhotoCredit>.Success(new PhotoCredit(credit)),
        };
    }
}
