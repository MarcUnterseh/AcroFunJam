namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>
/// Persistence shape of a transition proposal (table contribution.transition_proposals, ADR 0028): the oriented couple of
/// poses, the transition as proposed and, once decided, the decision and the transition as retained. No pose name: the current
/// names are read in the catalog.
/// </summary>
public sealed class TransitionProposalRecord
{
    public Guid Id { get; set; }

    /// <summary>Account identifier, without a foreign key towards the identity schema (modules stay decoupled).</summary>
    public Guid ContributorId { get; set; }

    /// <summary>The start pose of the catalog, without a foreign key towards the catalog schema (ADR 0016).</summary>
    public Guid FromPoseId { get; set; }

    /// <summary>The end pose of the catalog, without a foreign key towards the catalog schema (ADR 0016).</summary>
    public Guid ToPoseId { get; set; }

    public string? Name { get; set; }

    /// <summary>The comparison key of the name (ADR 0029), none without a name.</summary>
    public string? NameKey { get; set; }

    public required string BaseDifficulty { get; set; }

    public required string FlyerDifficulty { get; set; }

    public string? Description { get; set; }

    public required string Status { get; set; }

    public DateTimeOffset SubmittedAt { get; set; }

    public Guid? DecidedBy { get; set; }

    public DateTimeOffset? DecidedAt { get; set; }

    public string? RejectionReason { get; set; }

    public string? RetainedName { get; set; }

    public string? RetainedBaseDifficulty { get; set; }

    public string? RetainedFlyerDifficulty { get; set; }

    public string? RetainedDescription { get; set; }

    public string? AdjustmentNote { get; set; }

    /// <summary>The acceptance is a direct publication (ADR 0023): recorded when it happens, never deduced.</summary>
    public bool PublishedDirectly { get; set; }
}
