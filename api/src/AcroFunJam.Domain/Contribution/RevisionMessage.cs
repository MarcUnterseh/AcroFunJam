using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The optional message of a contributor that explains a revision to the validator (story 6, decision B of 2026-11-12):
/// same rules as the adjustment note.
/// </summary>
public sealed record RevisionMessage
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 500;

    private RevisionMessage(string value) => Value = value;

    /// <summary>Without superfluous spaces (a line break counts as a space); a message made only of spaces is no message.</summary>
    public static Result<RevisionMessage?> Create(string? raw)
    {
        var message = ProposalText.Normalize(raw);
        if (message.Length == 0) return Result<RevisionMessage?>.Success(null);
        if (ProposalText.IsLongerThan(message, MaxLength)) return ContributionErrors.RevisionMessageTooLong;
        return Result<RevisionMessage?>.Success(new RevisionMessage(message));
    }
}
