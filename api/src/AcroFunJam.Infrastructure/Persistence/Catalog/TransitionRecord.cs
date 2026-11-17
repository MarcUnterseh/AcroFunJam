namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Persistence shape of a published transition (table catalog.transitions, ADR 0028).</summary>
public sealed class TransitionRecord
{
    public Guid Id { get; set; }

    /// <summary>The start pose, a foreign key towards catalog.poses (same schema).</summary>
    public Guid FromPoseId { get; set; }

    /// <summary>The end pose, a foreign key towards catalog.poses (same schema).</summary>
    public Guid ToPoseId { get; set; }

    public string? Name { get; set; }

    /// <summary>The comparison key of the name (ADR 0029), none without a name.</summary>
    public string? NameKey { get; set; }

    public required string BaseDifficulty { get; set; }

    public required string FlyerDifficulty { get; set; }

    public string? Description { get; set; }

    /// <summary>Its tags (story 8, ADR 0033): a set written in one row, the last action winning.</summary>
#pragma warning disable CA1819 // An array column (uuid[]), mapped as such.
    public Guid[] TagIds { get; set; } = [];
#pragma warning restore CA1819

    public Guid? SourceProposalId { get; set; }

    public DateTimeOffset PublishedAt { get; set; }
}
