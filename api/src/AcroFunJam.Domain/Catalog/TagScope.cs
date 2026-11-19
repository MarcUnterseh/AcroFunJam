using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>An element a tag may be carried by (story 9a, ADR 0035).</summary>
public enum TagTarget
{
    Pose,
    Transition,
}

/// <summary>
/// What a tag applies to (glossary « Champ d'application », story 9a, Q164, ADR 0035): the poses, the transitions, or
/// both. Mandatory, without default value (Q167).
/// </summary>
public enum TagScope
{
    Poses,
    Transitions,
    PosesAndTransitions,
}

/// <summary>Stable codes of the scopes (<c>poses</c>…), shared by the HTTP contract and the storage, and their rules.</summary>
public static class TagScopeCodes
{
    public static readonly Error ScopeRequired =
        new("tag.scope-required", "Il faut préciser si l'étiquette s'applique aux poses, aux transitions ou aux deux.");

    public static Error UnknownScope(string code) => new("tag.unknown-scope", $"Le champ d'application « {code} » n'existe pas.");

    public static Result<TagScope> FromCode(string? code) => code?.Trim() switch
    {
        null or "" => ScopeRequired,
        "poses" => Result<TagScope>.Success(TagScope.Poses),
        "transitions" => Result<TagScope>.Success(TagScope.Transitions),
        "poses-and-transitions" => Result<TagScope>.Success(TagScope.PosesAndTransitions),
        _ => UnknownScope(code),
    };

    extension(TagScope scope)
    {
        public string ToCode() => scope switch
        {
            TagScope.Poses => "poses",
            TagScope.Transitions => "transitions",
            TagScope.PosesAndTransitions => "poses-and-transitions",
            _ => throw new ArgumentOutOfRangeException(nameof(scope), scope, "Unknown scope."),
        };

        /// <summary>The targets of the scope, poses first.</summary>
        public IReadOnlyList<TagTarget> Targets => scope switch
        {
            TagScope.Poses => [TagTarget.Pose],
            TagScope.Transitions => [TagTarget.Transition],
            _ => [TagTarget.Pose, TagTarget.Transition],
        };

        public bool Includes(TagTarget target) => scope.Targets.Contains(target);

        /// <summary>Whether every target of the other scope is a target of this one.</summary>
        public bool Covers(TagScope other) => other.Targets.All(t => scope.Includes(t));

        /// <summary>The targets this scope includes that the next one no longer does.</summary>
        public IReadOnlyList<TagTarget> WithdrawnBy(TagScope next) => [.. scope.Targets.Where(t => !next.Includes(t))];
    }
}
