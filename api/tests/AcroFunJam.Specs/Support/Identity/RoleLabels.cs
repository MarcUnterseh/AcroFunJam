namespace AcroFunJam.Specs.Support.Identity;

/// <summary>Translates the French words of the Gherkin into the codes of the HTTP contract.</summary>
public static class RoleLabels
{
    private static readonly Dictionary<string, string> RoleCodes = new(StringComparer.Ordinal)
    {
        ["utilisateur"] = "user",
        ["validateur"] = "validator",
        ["validatrice"] = "validator",
        ["administrateur"] = "administrator",
        ["administratrice"] = "administrator",
    };

    private static readonly Dictionary<string, string> CapabilityCodes = new(StringComparer.Ordinal)
    {
        ["proposer"] = "propose",
        ["accepter ou refuser une proposition"] = "validate-proposals",
        ["gérer les rôles"] = "manage-roles",
    };

    public static string RoleCode(string label) =>
        RoleCodes.TryGetValue(label, out var code) ? code : throw new ArgumentOutOfRangeException(nameof(label), label, "Rôle inconnu.");

    public static IReadOnlyList<string> CapabilityCodesOf(string labels) =>
    [
        .. labels.Split(", ").Select(label =>
            CapabilityCodes.TryGetValue(label, out var code)
                ? code
                : throw new ArgumentOutOfRangeException(nameof(labels), label, "Capacité inconnue.")),
    ];
}
