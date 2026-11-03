namespace AcroFunJam.Specs.Support.Catalog;

/// <summary>Translates the French labels of the Gherkin into the API difficulty codes (ADR 0007).</summary>
public static class DifficultyLabels
{
    private static readonly Dictionary<string, string> CodesByLabel = new(StringComparer.Ordinal)
    {
        ["découverte"] = "discovery",
        ["débutant"] = "beginner",
        ["intermédiaire"] = "intermediate",
        ["avancé"] = "advanced",
    };

    public static string ToCode(string label) =>
        CodesByLabel.TryGetValue(label, out var code)
            ? code
            : throw new ArgumentOutOfRangeException(nameof(label), label, "Niveau de difficulté inconnu.");

    /// <summary>The code of a known label; an unknown label (e.g. "expert") is sent as is, for the API to refuse it.</summary>
    public static string ToCodeOrAsIs(string label) => CodesByLabel.GetValueOrDefault(label, label);
}
