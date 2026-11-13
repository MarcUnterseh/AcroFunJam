namespace AcroFunJam.Specs.Support.Contribution;

/// <summary>
/// The identifiers of the pose revision proposals received in the scenario, by contributor and pose name, so that a
/// step can designate « la proposition de modification de la pose "Throne" par Alice » to the decision endpoints.
/// </summary>
public sealed class ScenarioPoseRevisions
{
    private readonly Dictionary<(string Contributor, string Pose), Guid> _ids = [];

    /// <summary>The last revision proposal received, for « la proposition garde … ».</summary>
    public (string Pose, string Contributor) Last { get; private set; }

    public void Received(string contributor, string pose, Guid id)
    {
        _ids[(contributor, pose)] = id;
        Last = (pose, contributor);
    }

    public Guid IdOf(string pose, string contributor) =>
        _ids.TryGetValue((contributor, pose), out var id)
            ? id
            : throw new InvalidOperationException($"Aucune proposition de modification de la pose « {pose} » par {contributor} dans ce scénario.");
}
