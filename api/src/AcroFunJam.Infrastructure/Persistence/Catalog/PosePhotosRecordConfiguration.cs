using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Mapping of <see cref="PosePhotosRecord"/> to the table catalog.pose_photos (ADR 0039).</summary>
public sealed class PosePhotosRecordConfiguration : IEntityTypeConfiguration<PosePhotosRecord>
{
    public void Configure(EntityTypeBuilder<PosePhotosRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("pose_photos", "catalog");
        builder.HasKey(p => p.PoseId);
        builder.Property(p => p.PoseId).HasColumnName("pose_id").ValueGeneratedNever();
        builder.Property(p => p.MainPhotoId).HasColumnName("main_photo_id");

        // The photos of a pose go with it, the day a pose can be removed (ADR 0039).
        builder.HasOne<PoseRecord>().WithOne().HasForeignKey<PosePhotosRecord>(p => p.PoseId).HasConstraintName("fk_pose_photos_pose")
            .OnDelete(DeleteBehavior.Cascade);
    }
}

/// <summary>Mapping of <see cref="PhotoRecord"/> to the table catalog.photos (ADR 0039).</summary>
public sealed class PhotoRecordConfiguration : IEntityTypeConfiguration<PhotoRecord>
{
    public void Configure(EntityTypeBuilder<PhotoRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("photos", "catalog", table =>
        {
            table.HasCheckConstraint("ck_photos_alt_text", $"alt_text <> '' AND char_length(alt_text) <= {AltText.MaxLength}");
            table.HasCheckConstraint("ck_photos_credit", $"credit <> '' AND char_length(credit) <= {PhotoCredit.MaxLength}");
            table.HasCheckConstraint("ck_photos_dimensions", "width > 0 AND height > 0");
        });
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(p => p.PoseId).HasColumnName("pose_id");
        builder.Property(p => p.AltText).HasColumnName("alt_text").IsRequired();
        builder.Property(p => p.Credit).HasColumnName("credit").IsRequired();
        builder.Property(p => p.Width).HasColumnName("width");
        builder.Property(p => p.Height).HasColumnName("height");
        builder.Property(p => p.AdditionRank).HasColumnName("addition_rank");
        builder.Property(p => p.AddedAt).HasColumnName("added_at");
        builder.Property(p => p.RightsConfirmedBy).HasColumnName("rights_confirmed_by");
        builder.Property(p => p.RightsConfirmedAt).HasColumnName("rights_confirmed_at");

        builder.HasOne<PosePhotosRecord>().WithMany().HasForeignKey(p => p.PoseId).HasConstraintName("fk_photos_pose_photos")
            .OnDelete(DeleteBehavior.Cascade);
        // The maximum of 5 photos is the aggregate's, under the lock pose-photos (ADR 0039): no constraint here.
        builder.HasIndex(p => p.PoseId).HasDatabaseName("ix_photos_pose_id");
    }
}
