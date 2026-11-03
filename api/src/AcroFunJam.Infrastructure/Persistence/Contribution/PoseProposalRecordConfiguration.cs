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
            table.HasCheckConstraint("ck_pose_proposals_status", "status IN ('pending', 'accepted')");
            table.HasCheckConstraint("ck_pose_proposals_name_length", "char_length(name) <= 60");
            table.HasCheckConstraint("ck_pose_proposals_name_key", "name_key <> ''");
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
        builder.Property(p => p.Status).HasColumnName("status").IsRequired();
        builder.Property(p => p.SubmittedAt).HasColumnName("submitted_at");
        builder.Property(p => p.AcceptedBy).HasColumnName("accepted_by");
        builder.Property(p => p.AcceptedAt).HasColumnName("accepted_at");

        builder.HasIndex(p => p.NameKey).HasDatabaseName(PendingNameKeyIndex).IsUnique().HasFilter("status = 'pending'");
        builder.HasIndex(p => p.ContributorId).HasDatabaseName("ix_pose_proposals_contributor_id"); // "mes propositions"
    }
}
