using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcroFunJam.Infrastructure.Persistence.Contribution;

/// <summary>Mapping of <see cref="TransitionProposalRecord"/> to the table contribution.transition_proposals (ADR 0028).</summary>
public sealed class TransitionProposalRecordConfiguration : IEntityTypeConfiguration<TransitionProposalRecord>
{
    /// <summary>A name between two poses, in this direction, taken by one pending proposal at most (ADR 0029).</summary>
    public static readonly string PendingNamedSlotIndex = "ix_transition_proposals_pending_named_slot";

    /// <summary>The unnamed place between two poses, in this direction, taken by one pending proposal at most (ADR 0029).</summary>
    public static readonly string PendingUnnamedSlotIndex = "ix_transition_proposals_pending_unnamed_slot";

    private const string Levels = "('discovery', 'beginner', 'intermediate', 'advanced')";

    public void Configure(EntityTypeBuilder<TransitionProposalRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("transition_proposals", PoseProposalRecordConfiguration.Schema, table =>
        {
            table.HasCheckConstraint("ck_transition_proposals_base_difficulty", $"base_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_transition_proposals_flyer_difficulty", $"flyer_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_transition_proposals_name_length", $"char_length(name) <= {TransitionName.MaxLength}");
            // A name has a non-empty key, and only a name has one.
            table.HasCheckConstraint("ck_transition_proposals_name_key", "(name IS NULL) = (name_key IS NULL) AND name_key <> ''");
            table.HasCheckConstraint("ck_transition_proposals_description", "description <> ''");
            table.HasCheckConstraint(
                "ck_transition_proposals_description_length", $"char_length(description) <= {TransitionDescription.MaxLength}");
            table.HasCheckConstraint("ck_transition_proposals_status", "status IN ('pending', 'accepted', 'rejected')");
            // A decision is recorded as a whole (ADR 0022): by whom and when, and why when rejected.
            table.HasCheckConstraint(
                "ck_transition_proposals_decision", "(status = 'pending') = (decided_by IS NULL) AND (status = 'pending') = (decided_at IS NULL)");
            table.HasCheckConstraint("ck_transition_proposals_rejection_reason", "(status = 'rejected') = (rejection_reason IS NOT NULL)");
            table.HasCheckConstraint(
                "ck_transition_proposals_rejection_reason_length", $"char_length(rejection_reason) <= {RejectionReason.MaxLength}");
            // An acceptance records its retained transition (its difficulties at least; name and description are optional).
            table.HasCheckConstraint(
                "ck_transition_proposals_retained_transition",
                "(status = 'accepted') = (retained_base_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_flyer_difficulty IS NOT NULL)"
                + " AND (status = 'accepted' OR (retained_name IS NULL AND retained_description IS NULL))");
            table.HasCheckConstraint("ck_transition_proposals_retained_base_difficulty", $"retained_base_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_transition_proposals_retained_flyer_difficulty", $"retained_flyer_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_transition_proposals_retained_name_length", $"char_length(retained_name) <= {TransitionName.MaxLength}");
            table.HasCheckConstraint(
                "ck_transition_proposals_retained_description_length", $"char_length(retained_description) <= {TransitionDescription.MaxLength}");
            table.HasCheckConstraint("ck_transition_proposals_adjustment_note", "adjustment_note IS NULL OR status = 'accepted'");
            table.HasCheckConstraint(
                "ck_transition_proposals_adjustment_note_length", $"char_length(adjustment_note) <= {AdjustmentNote.MaxLength}");
            // A direct publication retains the proposed transition as is, without note, decided by its contributor when submitted (ADR 0023).
            table.HasCheckConstraint(
                "ck_transition_proposals_published_directly",
                "NOT published_directly OR (status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at"
                + " AND adjustment_note IS NULL"
                + " AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_description)"
                + " IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, description))");
        });
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.ContributorId).HasColumnName("contributor_id");
        builder.Property(p => p.FromPoseId).HasColumnName("from_pose_id");
        builder.Property(p => p.ToPoseId).HasColumnName("to_pose_id");
        builder.Property(p => p.Name).HasColumnName("name");
        builder.Property(p => p.NameKey).HasColumnName("name_key");
        builder.Property(p => p.BaseDifficulty).HasColumnName("base_difficulty").IsRequired();
        builder.Property(p => p.FlyerDifficulty).HasColumnName("flyer_difficulty").IsRequired();
        builder.Property(p => p.Description).HasColumnName("description");
        // A decision is saved only if the proposal is still pending in storage (ADR 0022).
        builder.Property(p => p.Status).HasColumnName("status").IsRequired().IsConcurrencyToken();
        builder.Property(p => p.SubmittedAt).HasColumnName("submitted_at");
        builder.Property(p => p.DecidedBy).HasColumnName("decided_by");
        builder.Property(p => p.DecidedAt).HasColumnName("decided_at");
        builder.Property(p => p.RejectionReason).HasColumnName("rejection_reason");
        builder.Property(p => p.RetainedName).HasColumnName("retained_name");
        builder.Property(p => p.RetainedBaseDifficulty).HasColumnName("retained_base_difficulty");
        builder.Property(p => p.RetainedFlyerDifficulty).HasColumnName("retained_flyer_difficulty");
        builder.Property(p => p.RetainedDescription).HasColumnName("retained_description");
        builder.Property(p => p.AdjustmentNote).HasColumnName("adjustment_note");
        builder.Property(p => p.PublishedDirectly).HasColumnName("published_directly");

        // Two partial indexes rather than one NULLS NOT DISTINCT index, so that each violation tells its own error (ADR 0029).
        builder.HasIndex(p => new { p.FromPoseId, p.ToPoseId, p.NameKey }).HasDatabaseName(PendingNamedSlotIndex).IsUnique()
            .HasFilter("status = 'pending' AND name_key IS NOT NULL");
        builder.HasIndex(p => new { p.FromPoseId, p.ToPoseId }).HasDatabaseName(PendingUnnamedSlotIndex).IsUnique()
            .HasFilter("status = 'pending' AND name_key IS NULL");
        builder.HasIndex(p => p.ContributorId).HasDatabaseName("ix_transition_proposals_contributor_id"); // "mes propositions"
    }
}
