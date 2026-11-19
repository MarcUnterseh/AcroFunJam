using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>Mapping of <see cref="PoseRevisionProposalRecord"/> to the table contribution.pose_revision_proposals (ADR 0026).</summary>
public sealed class PoseRevisionProposalRecordConfiguration : IEntityTypeConfiguration<PoseRevisionProposalRecord>
{
    /// <summary>A name key reserved by one pending revision at most (ADR 0025).</summary>
    public static readonly string PendingReservedNameKeyIndex = "ix_pose_revision_proposals_pending_reserved_name_key";

    /// <summary>One pending revision per published pose (ADR 0025).</summary>
    public static readonly string PendingPoseIndex = "ix_pose_revision_proposals_pending_pose_id";

    private const string Levels = "('discovery', 'beginner', 'intermediate', 'advanced')";

    public void Configure(EntityTypeBuilder<PoseRevisionProposalRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("pose_revision_proposals", PoseProposalRecordConfiguration.Schema, table =>
        {
            table.HasCheckConstraint("ck_pose_revision_proposals_prior_base_difficulty", $"prior_base_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_pose_revision_proposals_prior_flyer_difficulty", $"prior_flyer_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_pose_revision_proposals_base_difficulty", $"base_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_pose_revision_proposals_flyer_difficulty", $"flyer_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_pose_revision_proposals_prior_name_length", $"char_length(prior_name) <= {PoseName.MaxLength}");
            table.HasCheckConstraint("ck_pose_revision_proposals_name_length", $"char_length(name) <= {PoseName.MaxLength}");
            table.HasCheckConstraint("ck_pose_revision_proposals_status", "status IN ('pending', 'accepted', 'rejected')");
            table.HasCheckConstraint("ck_pose_revision_proposals_base_version", "base_version >= 1");
            table.HasCheckConstraint("ck_pose_revision_proposals_reserved_name_key", "reserved_name_key IS NULL OR reserved_name_key <> ''");
            table.HasCheckConstraint("ck_pose_revision_proposals_message_length", $"char_length(message) <= {RevisionMessage.MaxLength}");
            // A decision is recorded as a whole (ADR 0022): by whom and when, and why when rejected.
            table.HasCheckConstraint(
                "ck_pose_revision_proposals_decision", "(status = 'pending') = (decided_by IS NULL) AND (status = 'pending') = (decided_at IS NULL)");
            table.HasCheckConstraint("ck_pose_revision_proposals_rejection_reason", "(status = 'rejected') = (rejection_reason IS NOT NULL)");
            table.HasCheckConstraint(
                "ck_pose_revision_proposals_rejection_reason_length", $"char_length(rejection_reason) <= {RejectionReason.MaxLength}");
            // An acceptance records its retained pose as a whole, and only an acceptance has one, or an adjustment note.
            table.HasCheckConstraint(
                "ck_pose_revision_proposals_retained_pose",
                "(status = 'accepted') = (retained_name IS NOT NULL) AND (status = 'accepted') = (retained_base_difficulty IS NOT NULL)"
                + " AND (status = 'accepted') = (retained_flyer_difficulty IS NOT NULL)"
                + " AND (status = 'accepted') = (retained_can_start_flow IS NOT NULL)"
                + " AND (status = 'accepted') = (retained_can_end_flow IS NOT NULL)"
                + " AND (status = 'accepted') = (retained_tag_ids IS NOT NULL)");
            table.HasCheckConstraint("ck_pose_revision_proposals_retained_base_difficulty", $"retained_base_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_pose_revision_proposals_retained_flyer_difficulty", $"retained_flyer_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_pose_revision_proposals_retained_name_length", $"char_length(retained_name) <= {PoseName.MaxLength}");
            table.HasCheckConstraint("ck_pose_revision_proposals_adjustment_note", "adjustment_note IS NULL OR status = 'accepted'");
            table.HasCheckConstraint(
                "ck_pose_revision_proposals_adjustment_note_length", $"char_length(adjustment_note) <= {AdjustmentNote.MaxLength}");
            // A retained revision changes the pose (story 6): it differs from the values before the revision.
            table.HasCheckConstraint(
                "ck_pose_revision_proposals_retained_changes_the_pose",
                "status <> 'accepted'"
                + " OR (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow)"
                + " IS DISTINCT FROM (prior_name, prior_base_difficulty, prior_flyer_difficulty, prior_can_start_flow, prior_can_end_flow)"
                + " OR NOT (retained_tag_ids @> prior_tag_ids AND retained_tag_ids <@ prior_tag_ids)");
            // A direct publication retains the revised pose as is, without note, decided by its contributor when submitted (ADR 0023).
            table.HasCheckConstraint(
                "ck_pose_revision_proposals_published_directly",
                "NOT published_directly OR (status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at"
                + " AND adjustment_note IS NULL"
                + " AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow)"
                + " IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow)"
                + " AND retained_tag_ids @> tag_ids AND retained_tag_ids <@ tag_ids)");
        });
        builder.HasKey(p => p.Id);
        // Story 9a: the tags of the pose before, of the revised and of the retained pose; the pending revisions carrying a tag
        // (its removal, ADR 0036).
        builder.Property(p => p.PriorTagIds).HasColumnName("prior_tag_ids").HasDefaultValueSql("'{}'").IsRequired();
        builder.Property(p => p.TagIds).HasColumnName("tag_ids").HasDefaultValueSql("'{}'").IsRequired();
        builder.Property(p => p.RetainedTagIds).HasColumnName("retained_tag_ids");
        builder.HasIndex(p => p.TagIds).HasDatabaseName("ix_pose_revision_proposals_pending_tag_ids").HasMethod("gin")
            .HasFilter("status = 'pending'");
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.ContributorId).HasColumnName("contributor_id");
        builder.Property(p => p.PoseId).HasColumnName("pose_id");
        builder.Property(p => p.BaseVersion).HasColumnName("base_version");
        builder.Property(p => p.PriorName).HasColumnName("prior_name").IsRequired();
        builder.Property(p => p.PriorBaseDifficulty).HasColumnName("prior_base_difficulty").IsRequired();
        builder.Property(p => p.PriorFlyerDifficulty).HasColumnName("prior_flyer_difficulty").IsRequired();
        builder.Property(p => p.PriorCanStartFlow).HasColumnName("prior_can_start_flow");
        builder.Property(p => p.PriorCanEndFlow).HasColumnName("prior_can_end_flow");
        builder.Property(p => p.Name).HasColumnName("name").IsRequired();
        builder.Property(p => p.BaseDifficulty).HasColumnName("base_difficulty").IsRequired();
        builder.Property(p => p.FlyerDifficulty).HasColumnName("flyer_difficulty").IsRequired();
        builder.Property(p => p.CanStartFlow).HasColumnName("can_start_flow");
        builder.Property(p => p.CanEndFlow).HasColumnName("can_end_flow");
        builder.Property(p => p.ReservedNameKey).HasColumnName("reserved_name_key");
        builder.Property(p => p.Message).HasColumnName("message");
        // A decision is saved only if the revision is still pending in storage (ADR 0022).
        builder.Property(p => p.Status).HasColumnName("status").IsRequired().IsConcurrencyToken();
        builder.Property(p => p.SubmittedAt).HasColumnName("submitted_at");
        builder.Property(p => p.DecidedBy).HasColumnName("decided_by");
        builder.Property(p => p.DecidedAt).HasColumnName("decided_at");
        builder.Property(p => p.RejectionReason).HasColumnName("rejection_reason");
        builder.Property(p => p.RetainedName).HasColumnName("retained_name");
        builder.Property(p => p.RetainedBaseDifficulty).HasColumnName("retained_base_difficulty");
        builder.Property(p => p.RetainedFlyerDifficulty).HasColumnName("retained_flyer_difficulty");
        builder.Property(p => p.RetainedCanStartFlow).HasColumnName("retained_can_start_flow");
        builder.Property(p => p.RetainedCanEndFlow).HasColumnName("retained_can_end_flow");
        builder.Property(p => p.AdjustmentNote).HasColumnName("adjustment_note");
        builder.Property(p => p.PublishedDirectly).HasColumnName("published_directly");

        builder.HasIndex(p => p.ReservedNameKey).HasDatabaseName(PendingReservedNameKeyIndex).IsUnique().HasFilter("status = 'pending'");
        builder.HasIndex(p => p.PoseId).HasDatabaseName(PendingPoseIndex).IsUnique().HasFilter("status = 'pending'");
        builder.HasIndex(p => p.ContributorId).HasDatabaseName("ix_pose_revision_proposals_contributor_id"); // "mes propositions"
    }
}
