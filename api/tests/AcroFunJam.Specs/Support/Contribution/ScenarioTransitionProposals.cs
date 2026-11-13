namespace AcroFunJam.Specs.Support.Contribution;

/// <summary>
/// The identifiers of the transition proposals received in the scenario, by contributor, poses and name (none for an unnamed
/// one), so that a step can designate « la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice ».
/// </summary>
public sealed class ScenarioTransitionProposals
{
    private readonly Dictionary<(string Contributor, string From, string To, string? Name), Guid> _ids = [];

    public void Received(string contributor, string from, string to, string? name, Guid id) => _ids[(contributor, from, to, name)] = id;

    public Guid IdOf(string contributor, string from, string to, string? name) =>
        _ids.TryGetValue((contributor, from, to, name), out var id)
            ? id
            : throw new InvalidOperationException(
                $"Aucune proposition de la transition « {name ?? "sans nom"} » de {from} vers {to} par {contributor} dans ce scénario.");
}
