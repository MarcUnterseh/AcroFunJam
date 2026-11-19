using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Mapping of <see cref="PoseRecord"/> to the table catalog.poses.</summary>
public sealed class PoseRecordConfiguration : IEntityTypeConfiguration<PoseRecord>
{
    /// <summary>One published pose per name key (ADR 0017).</summary>
    public static readonly string NameKeyIndex = "ix_poses_name_key";

    public void Configure(EntityTypeBuilder<PoseRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("poses", "catalog", table =>
        {
            table.HasCheckConstraint("ck_poses_base_difficulty", "base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
            table.HasCheckConstraint("ck_poses_flyer_difficulty", "flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
            table.HasCheckConstraint("ck_poses_name_length", "char_length(name) <= 60");
            table.HasCheckConstraint("ck_poses_name_key", "name_key <> ''");
            table.HasCheckConstraint("ck_poses_version", "version >= 1");
        });
        builder.HasKey(pose => pose.Id);
        builder.Property(pose => pose.Id).HasColumnName("id");
        builder.Property(pose => pose.Name).HasColumnName("name").IsRequired();
        builder.Property(pose => pose.NameKey).HasColumnName("name_key").IsRequired();
        builder.Property(pose => pose.BaseDifficulty).HasColumnName("base_difficulty").IsRequired();
        builder.Property(pose => pose.FlyerDifficulty).HasColumnName("flyer_difficulty").IsRequired();
        builder.Property(pose => pose.CanStartFlow).HasColumnName("can_start_flow");
        builder.Property(pose => pose.CanEndFlow).HasColumnName("can_end_flow");
        builder.Property(pose => pose.SourceProposalId).HasColumnName("source_proposal_id");
        builder.Property(pose => pose.PublishedAt).HasColumnName("published_at");
        // A revision is saved only if the pose is still at the version it was read at (ADR 0024).
        builder.Property(pose => pose.Version).HasColumnName("version").IsConcurrencyToken();

        builder.HasIndex(pose => pose.NameKey).HasDatabaseName(NameKeyIndex).IsUnique();
        // Story 9a: the tags of the pose; « which poses carry this tag » (removal, scope, counts) reads this index.
        builder.Property(pose => pose.TagIds).HasColumnName("tag_ids").IsRequired();
        builder.HasIndex(pose => pose.TagIds).HasDatabaseName("ix_poses_tag_ids").HasMethod("gin");
    }
}
