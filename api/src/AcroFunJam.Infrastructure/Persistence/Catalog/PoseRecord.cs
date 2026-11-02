namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Persistence shape of a pose of the catalog (table catalog.poses).</summary>
public sealed class PoseRecord
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public required string BaseDifficulty { get; set; }

    public required string FlyerDifficulty { get; set; }
}
