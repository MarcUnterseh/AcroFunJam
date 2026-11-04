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
}
