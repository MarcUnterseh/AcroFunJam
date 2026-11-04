using AcroFunJam.Domain.Contribution;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>Mapping of <see cref="PoseProposalRecord"/> to the table contribution.pose_proposals.</summary>
public sealed class PoseProposalRecordConfiguration : IEntityTypeConfiguration<PoseProposalRecord>
{
    public const string Schema = "contribution";

    /// <summary>One pending proposal per name key (ADR 0017); a violation is translated by <see cref="ContributionUniqueConstraints"/>.</summary>
    public static readonly string PendingNameKeyIndex = "ix_pose_proposals_pending_name_key";

    public void Configure(EntityTypeBuilder<PoseProposalRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("pose_proposals", Schema, table =>
        {
            table.HasCheckConstraint("ck_pose_proposals_base_difficulty", "base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
            table.HasCheckConstraint("ck_pose_proposals_flyer_difficulty", "flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
            table.HasCheckConstraint("ck_pose_proposals_status", "status IN ('pending', 'accepted', 'rejected')");
            table.HasCheckConstraint("ck_pose_proposals_name_length", "char_length(name) <= 60");
            table.HasCheckConstraint("ck_pose_proposals_name_key", "name_key <> ''");
            // A decision is recorded as a whole (ADR 0022): by whom and when, and why when rejected.
            table.HasCheckConstraint(
                "ck_pose_proposals_decision", "(status = 'pending') = (decided_by IS NULL) AND (status = 'pending') = (decided_at IS NULL)");
            table.HasCheckConstraint("ck_pose_proposals_rejection_reason", "(status = 'rejected') = (rejection_reason IS NOT NULL)");
            table.HasCheckConstraint(
                "ck_pose_proposals_rejection_reason_length", $"char_length(rejection_reason) <= {RejectionReason.MaxLength}");
        });
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.ContributorId).HasColumnName("contributor_id");
        builder.Property(p => p.Name).HasColumnName("name").IsRequired();
        builder.Property(p => p.NameKey).HasColumnName("name_key").IsRequired();
        builder.Property(p => p.BaseDifficulty).HasColumnName("base_difficulty").IsRequired();
        builder.Property(p => p.FlyerDifficulty).HasColumnName("flyer_difficulty").IsRequired();
        builder.Property(p => p.CanStartFlow).HasColumnName("can_start_flow");
        builder.Property(p => p.CanEndFlow).HasColumnName("can_end_flow");
        // A decision is saved only if the proposal is still pending in storage (ADR 0022).
        builder.Property(p => p.Status).HasColumnName("status").IsRequired().IsConcurrencyToken();
        builder.Property(p => p.SubmittedAt).HasColumnName("submitted_at");
        builder.Property(p => p.DecidedBy).HasColumnName("decided_by");
        builder.Property(p => p.DecidedAt).HasColumnName("decided_at");
        builder.Property(p => p.RejectionReason).HasColumnName("rejection_reason");

        builder.HasIndex(p => p.NameKey).HasDatabaseName(PendingNameKeyIndex).IsUnique().HasFilter("status = 'pending'");
        builder.HasIndex(p => p.SubmittedAt).HasDatabaseName("ix_pose_proposals_pending_submitted_at").HasFilter("status = 'pending'"); // validation queue
        builder.HasIndex(p => p.ContributorId).HasDatabaseName("ix_pose_proposals_contributor_id"); // "mes propositions"
    }
}
