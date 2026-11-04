using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// Why a validator rejects a proposal, written for its contributor: free text, required (ADR 0022).
/// </summary>
public sealed record RejectionReason
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 500;

    private RejectionReason(string value) => Value = value;

    public static Result<RejectionReason> Create(string? raw)
    {
        var reason = ValidatorText.Normalize(raw);
        if (reason.Length == 0) return ContributionErrors.RejectionReasonRequired;
        if (ValidatorText.IsLongerThan(reason, MaxLength)) return ContributionErrors.RejectionReasonTooLong;
        return Result<RejectionReason>.Success(new RejectionReason(reason));
    }
}
