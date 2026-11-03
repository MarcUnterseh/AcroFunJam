namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Persistence shape of a pose of the catalog (table catalog.poses).</summary>
public sealed class PoseRecord
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    /// <summary>Comparison key of the name, computed by the domain (ADR 0017), unique in the catalog.</summary>
    public required string NameKey { get; set; }

    public required string BaseDifficulty { get; set; }

    public required string FlyerDifficulty { get; set; }

    public bool CanStartFlow { get; set; }

    public bool CanEndFlow { get; set; }

    /// <summary>The proposal the pose was published from, without a foreign key towards the contribution schema.</summary>
    public Guid? SourceProposalId { get; set; }

    public DateTimeOffset PublishedAt { get; set; }
}
