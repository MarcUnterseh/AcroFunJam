using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Mapping of <see cref="TransitionRecord"/> to the table catalog.transitions (ADR 0028, ADR 0029).</summary>
public sealed class TransitionRecordConfiguration : IEntityTypeConfiguration<TransitionRecord>
{
    /// <summary>A name between two poses, in this direction, taken by one published transition at most (ADR 0029).</summary>
    public static readonly string NamedSlotIndex = "ix_transitions_named_slot";

    /// <summary>The unnamed place between two poses, in this direction, taken by one published transition at most (ADR 0029).</summary>
    public static readonly string UnnamedSlotIndex = "ix_transitions_unnamed_slot";

    private const string Levels = "('discovery', 'beginner', 'intermediate', 'advanced')";

    public void Configure(EntityTypeBuilder<TransitionRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("transitions", "catalog", table =>
        {
            table.HasCheckConstraint("ck_transitions_base_difficulty", $"base_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_transitions_flyer_difficulty", $"flyer_difficulty IN {Levels}");
            table.HasCheckConstraint("ck_transitions_name_length", $"char_length(name) <= {TransitionName.MaxLength}");
            // A name has a non-empty key, and only a name has one.
            table.HasCheckConstraint("ck_transitions_name_key", "(name IS NULL) = (name_key IS NULL) AND name_key <> ''");
            table.HasCheckConstraint("ck_transitions_description", "description <> ''");
            table.HasCheckConstraint("ck_transitions_description_length", $"char_length(description) <= {TransitionDescription.MaxLength}");
        });
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.FromPoseId).HasColumnName("from_pose_id");
        builder.Property(t => t.ToPoseId).HasColumnName("to_pose_id");
        builder.Property(t => t.Name).HasColumnName("name");
        builder.Property(t => t.NameKey).HasColumnName("name_key");
        builder.Property(t => t.BaseDifficulty).HasColumnName("base_difficulty").IsRequired();
        builder.Property(t => t.FlyerDifficulty).HasColumnName("flyer_difficulty").IsRequired();
        builder.Property(t => t.Description).HasColumnName("description");
        builder.Property(t => t.TagIds).HasColumnName("tag_ids").HasDefaultValueSql("'{}'").IsRequired();
        builder.Property(t => t.SourceProposalId).HasColumnName("source_proposal_id");
        builder.Property(t => t.PublishedAt).HasColumnName("published_at");

        // The poses are never removed today: the foreign keys forbid any silent deletion (ADR 0028).
        builder.HasOne<PoseRecord>().WithMany().HasForeignKey(t => t.FromPoseId).HasConstraintName("fk_transitions_from_pose")
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PoseRecord>().WithMany().HasForeignKey(t => t.ToPoseId).HasConstraintName("fk_transitions_to_pose")
            .OnDelete(DeleteBehavior.Restrict);

        // Two partial indexes rather than one NULLS NOT DISTINCT index, so that each violation tells its own error (ADR 0029).
        builder.HasIndex(t => new { t.FromPoseId, t.ToPoseId, t.NameKey }).HasDatabaseName(NamedSlotIndex).IsUnique().HasFilter("name_key IS NOT NULL");
        builder.HasIndex(t => new { t.FromPoseId, t.ToPoseId }).HasDatabaseName(UnnamedSlotIndex).IsUnique().HasFilter("name_key IS NULL");
        builder.HasIndex(t => t.ToPoseId).HasDatabaseName("ix_transitions_to_pose_id"); // "transitions vers"
        // The carriers of a tag: its count, and the refusal of its removal (ADR 0033).
        builder.HasIndex(t => t.TagIds).HasDatabaseName("ix_transitions_tag_ids").HasMethod("gin");
    }
}
