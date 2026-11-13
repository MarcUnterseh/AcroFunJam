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

    /// <summary>The identifier of a proposal of a pose of that name, whoever proposed it, if any.</summary>
    public Guid? AnyIdOf(string pose) =>
        _ids.Where(entry => entry.Key.Pose == pose).Select(entry => (Guid?)entry.Value).FirstOrDefault();
}
