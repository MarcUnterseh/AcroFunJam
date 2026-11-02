namespace AcroFunJam.Specs.Support.Catalog;

/// <summary>A published pose seeded by a "Soit" step (difficulties as API codes).</summary>
public sealed record SeededPose(string Name, string BaseDifficulty, string FlyerDifficulty);

/// <summary>
/// Poses published in the catalog for the current scenario. No publishing use case exists yet,
/// so the steps seed them here and the API factory exposes them behind the read port (ADR 0006).
/// </summary>
public sealed class CatalogTestData
{
    private readonly List<SeededPose> _publishedPoses = [];

    public IReadOnlyList<SeededPose> PublishedPoses => _publishedPoses;

    public void Publish(SeededPose pose) => _publishedPoses.Add(pose);
}
