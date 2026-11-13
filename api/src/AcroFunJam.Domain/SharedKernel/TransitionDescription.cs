using System.Text;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The optional description of a transition, published with it (story 7, R12, ADR 0028): it tells the passage (a position
/// of passage, the grips, a video link as plain text). Its lines are kept (Q105), unlike a proposal text.
/// </summary>
public sealed record TransitionDescription
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 500;

    private TransitionDescription(string value) => Value = value;

    /// <summary>
    /// NFC, line endings as <c>\n</c>, spaces and line breaks removed at the start and the end only; missing or made only of
    /// spaces is no description (success, <c>null</c>).
    /// </summary>
    public static Result<TransitionDescription?> CreateOptional(string? raw)
    {
        var description = (raw ?? string.Empty).Normalize(NormalizationForm.FormC).ReplaceLineEndings("\n").Trim();
        if (description.Length == 0) return Result<TransitionDescription?>.Success(null);
        if (NameText.IsLongerThan(description, MaxLength)) return TransitionContentErrors.DescriptionTooLong;
        return Result<TransitionDescription?>.Success(new TransitionDescription(description));
    }
}
