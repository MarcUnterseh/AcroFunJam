namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>Persistence shape of a pose proposal (table contribution.pose_proposals).</summary>
public sealed class PoseProposalRecord
{
    public Guid Id { get; set; }

    /// <summary>Account identifier, without a foreign key towards the identity schema (modules stay decoupled).</summary>
    public Guid ContributorId { get; set; }

    public required string Name { get; set; }

    public required string NameKey { get; set; }

    public required string BaseDifficulty { get; set; }

    public required string FlyerDifficulty { get; set; }

    public bool CanStartFlow { get; set; }

    public bool CanEndFlow { get; set; }

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

    /// <summary>The acceptance is a direct publication (ADR 0023): recorded when it happens, never deduced.</summary>
    public bool PublishedDirectly { get; set; }

    /// <summary>The proposed tags (story 9a, ADR 0036), by identifier; none for a pose proposed without.</summary>
    public Guid[] ProposedTagIds { get; set; } = [];

    /// <summary>The retained tags, once accepted (story 9a); null while pending or once rejected.</summary>
    public Guid[]? RetainedTagIds { get; set; }
}
