namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>
/// Persistence shape of a pose revision proposal (table contribution.pose_revision_proposals, ADR 0026): whole poses, the
/// values before the revision (prior_*) and the pose as revised.
/// </summary>
public sealed class PoseRevisionProposalRecord
{
    public Guid Id { get; set; }

    /// <summary>Account identifier, without a foreign key towards the identity schema (modules stay decoupled).</summary>
    public Guid ContributorId { get; set; }

    /// <summary>The revised pose of the catalog, without a foreign key towards the catalog schema (ADR 0016).</summary>
    public Guid PoseId { get; set; }

    /// <summary>The version of the pose the revision started from (ADR 0024).</summary>
    public int BaseVersion { get; set; }

    public required string PriorName { get; set; }

    public required string PriorBaseDifficulty { get; set; }

    public required string PriorFlyerDifficulty { get; set; }

    public bool PriorCanStartFlow { get; set; }

    public bool PriorCanEndFlow { get; set; }

    public required string Name { get; set; }

    public required string BaseDifficulty { get; set; }

    public required string FlyerDifficulty { get; set; }

    public bool CanStartFlow { get; set; }

    public bool CanEndFlow { get; set; }

    /// <summary>The name key the revision reserves while pending, none when the key does not change (ADR 0025).</summary>
    public string? ReservedNameKey { get; set; }

    /// <summary>The optional message of the contributor, for the validator.</summary>
    public string? Message { get; set; }

    public required string Status { get; set; }

    public DateTimeOffset SubmittedAt { get; set; }

    public Guid? DecidedBy { get; set; }

    public DateTimeOffset? DecidedAt { get; set; }

    public string? RejectionReason { get; set; }

    public string? RetainedName { get; set; }

    public string? RetainedBaseDifficulty { get; set; }

    public string? RetainedFlyerDifficulty { get; set; }

    public bool? RetainedCanStartFlow { get; set; }

    public bool? RetainedCanEndFlow { get; set; }

    public string? AdjustmentNote { get; set; }

    /// <summary>The acceptance is a direct publication (ADR 0023, ADR 0026): recorded when it happens, never deduced.</summary>
    public bool PublishedDirectly { get; set; }

    /// <summary>The tags of the pose before the revision (story 9a, ADR 0036), by identifier.</summary>
    public Guid[] PriorTagIds { get; set; } = [];

    /// <summary>The tags of the revised pose, by identifier (story 9a).</summary>
    public Guid[] TagIds { get; set; } = [];

    /// <summary>The retained tags, once accepted (story 9a); null while pending or once rejected.</summary>
    public Guid[]? RetainedTagIds { get; set; }
}
