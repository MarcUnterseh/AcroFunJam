namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Persistence shape of the list of tags (table catalog.tag_lists, a single row, ADR 0032): its existence marks it seeded.</summary>
public sealed class TagListRecord
{
    public Guid Id { get; set; }

    /// <summary>When the initial tags were seeded; none for a list started empty (the scenarios).</summary>
    public DateTimeOffset? SeededAt { get; set; }

    /// <summary>The revision of the initial list it is at (ADR 0035); none for a list started empty.</summary>
    public int? SeedRevision { get; set; }
}

/// <summary>Persistence shape of a tag of the list (table catalog.tags, ADR 0032), removed ones included.</summary>
public sealed class TagRecord
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    /// <summary>The comparison key of the name (ADR 0017), unique among the tags still in the list.</summary>
    public required string NameKey { get; set; }

    public required string Description { get; set; }

    /// <summary>The tag this one implies, a foreign key towards catalog.tags.</summary>
    public Guid? ImpliedTagId { get; set; }

    /// <summary>What the tag applies to, by code (<c>poses</c>, <c>transitions</c>, <c>poses-and-transitions</c>, ADR 0035).</summary>
    public required string Scope { get; set; }

    public DateTimeOffset? RemovedAt { get; set; }
}
