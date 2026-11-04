using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The optional message of a validator that accompanies an acceptance with adjustments, and only it, to explain them to
/// the contributor (story 5). Same rules as the rejection reason, but optional (ADR 0022).
/// </summary>
public sealed record AdjustmentNote
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 500;

    private AdjustmentNote(string value) => Value = value;

    /// <summary>Without superfluous spaces (a line break counts as a space); a message made only of spaces is no message.</summary>
    public static Result<AdjustmentNote?> Create(string? raw)
    {
        var note = ValidatorText.Normalize(raw);
        if (note.Length == 0) return Result<AdjustmentNote?>.Success(null);
        if (ValidatorText.IsLongerThan(note, MaxLength)) return ContributionErrors.AdjustmentNoteTooLong;
        return Result<AdjustmentNote?>.Success(new AdjustmentNote(note));
    }
}
