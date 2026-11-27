using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The credit of a video (story 12, V13, Q287, UX-49): who the video belongs to, a person, a duo or a collective, shown as
/// « Vidéo : Léa Martin ». The rule is <see cref="CreditText"/>, shared with the credit of a photo.
/// </summary>
public sealed record VideoCredit
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = CreditText.MaxLength;

    private VideoCredit(string value) => Value = value;

    public static Result<VideoCredit> Create(string? raw)
    {
        var (credit, verdict) = CreditText.Judge(raw);
        return verdict switch
        {
            CreditText.Verdict.Missing => VideoContentErrors.CreditRequired,
            CreditText.Verdict.NotAnAuthor => VideoContentErrors.CreditNotAnAuthor,
            CreditText.Verdict.TooLong => VideoContentErrors.CreditTooLong,
            _ => Result<VideoCredit>.Success(new VideoCredit(credit)),
        };
    }
}
