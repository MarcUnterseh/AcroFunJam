namespace AcroFunJam.Specs.Support.Contribution;

/// <summary>
/// The identifiers of the proposals received in the scenario, by contributor and pose name, so that a step can
/// designate « la proposition de la pose "Throne" par Alice » to the decision endpoints.
/// </summary>
public sealed class ScenarioProposals
{
    private readonly Dictionary<(string Contributor, string Pose), Guid> _ids = [];

    public void Received(string contributor, string pose, Guid id) => _ids[(contributor, pose)] = id;

    public Guid IdOf(string pose, string contributor) =>
        _ids.TryGetValue((contributor, pose), out var id)
            ? id
            : throw new InvalidOperationException($"Aucune proposition de la pose « {pose} » par {contributor} dans ce scénario.");
}
