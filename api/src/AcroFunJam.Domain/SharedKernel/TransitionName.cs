using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// The usual name of a transition (e.g. "Ninja Star"), optional (story 7, R8, ADR 0028): most transitions are known only by
/// their poses. When given, it follows the rules of a pose name.
/// </summary>
public sealed record TransitionName
{
    public string Value { get; }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 60;

    private TransitionName(string value) => Value = value;

    /// <summary>
    /// A name missing or made only of spaces is no name (success, <c>null</c>); one made only of punctuation or symbols is
    /// refused (Q107), as it would read as a name but have an empty key.
    /// </summary>
    public static Result<TransitionName?> CreateOptional(string? raw)
    {
        var name = NameText.Normalize(raw);
        if (name.Length == 0) return Result<TransitionName?>.Success(null);
        if (PoseNameKey.Compute(name).Length == 0) return TransitionContentErrors.NameWithoutLetterOrDigit;
        if (NameText.IsLongerThan(name, MaxLength)) return TransitionContentErrors.NameTooLong;
        return Result<TransitionName?>.Success(new TransitionName(name));
    }

    public TransitionNameKey Key => TransitionNameKey.From(this);
}
