using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Mapping of <see cref="VideoRecord"/> to the table catalog.videos (ADR 0041).</summary>
public sealed class VideoRecordConfiguration : IEntityTypeConfiguration<VideoRecord>
{
    public void Configure(EntityTypeBuilder<VideoRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("videos", "catalog", table =>
        {
            table.HasCheckConstraint("ck_videos_caption", $"caption <> '' AND char_length(caption) <= {VideoCaption.MaxLength}");
            table.HasCheckConstraint("ck_videos_credit", $"credit <> '' AND char_length(credit) <= {VideoCredit.MaxLength}");
            table.HasCheckConstraint("ck_videos_description",
                $"description IS NULL OR (description <> '' AND char_length(description) <= {VideoDescription.MaxLength})");
            table.HasCheckConstraint("ck_videos_dimensions", "width > 0 AND height > 0");
            table.HasCheckConstraint("ck_videos_preparation", "preparation IN ('in-preparation', 'ready', 'failed')");
        });
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(v => v.TransitionId).HasColumnName("transition_id");
        builder.Property(v => v.Caption).HasColumnName("caption").IsRequired();
        builder.Property(v => v.Credit).HasColumnName("credit").IsRequired();
        builder.Property(v => v.Description).HasColumnName("description");
        builder.Property(v => v.Width).HasColumnName("width");
        builder.Property(v => v.Height).HasColumnName("height");
        builder.Property(v => v.DurationMs).HasColumnName("duration_ms");
        builder.Property(v => v.Preparation).HasColumnName("preparation").IsRequired();
        builder.Property(v => v.AdditionRank).HasColumnName("addition_rank");
        builder.Property(v => v.AddedAt).HasColumnName("added_at");
        builder.Property(v => v.RightsConfirmedBy).HasColumnName("rights_confirmed_by");
        builder.Property(v => v.RightsConfirmedAt).HasColumnName("rights_confirmed_at");

        // The videos of a transition go with it, the day a transition can be removed (ADR 0041). Adding a video never touches
        // the row of the transition.
        builder.HasOne<TransitionRecord>().WithMany().HasForeignKey(v => v.TransitionId).HasConstraintName("fk_videos_transitions")
            .OnDelete(DeleteBehavior.Cascade);
        // The maximum of 3 videos is the aggregate's, under the lock transition-videos (ADR 0041): no constraint here.
        builder.HasIndex(v => v.TransitionId).HasDatabaseName("ix_videos_transition_id");
    }
}

/// <summary>Mapping of <see cref="VideoPreparationJobRecord"/> to the table catalog.video_preparation_jobs (ADR 0041).</summary>
public sealed class VideoPreparationJobRecordConfiguration : IEntityTypeConfiguration<VideoPreparationJobRecord>
{
    public void Configure(EntityTypeBuilder<VideoPreparationJobRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("video_preparation_jobs", "catalog");
        builder.HasKey(j => j.VideoId);
        builder.Property(j => j.VideoId).HasColumnName("video_id").ValueGeneratedNever();
        builder.Property(j => j.TransitionId).HasColumnName("transition_id");
        builder.Property(j => j.EnqueuedAt).HasColumnName("enqueued_at");
        builder.Property(j => j.Attempts).HasColumnName("attempts");
        builder.Property(j => j.LeaseUntil).HasColumnName("lease_until");

        // A removed video takes its job away (ADR 0041).
        builder.HasOne<VideoRecord>().WithOne().HasForeignKey<VideoPreparationJobRecord>(j => j.VideoId)
            .HasConstraintName("fk_video_preparation_jobs_videos").OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(j => j.EnqueuedAt).HasDatabaseName("ix_video_preparation_jobs_enqueued_at");
    }
}
