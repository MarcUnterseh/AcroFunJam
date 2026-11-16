using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Mapping of <see cref="TagListRecord"/> to the table catalog.tag_lists (ADR 0032).</summary>
public sealed class TagListRecordConfiguration : IEntityTypeConfiguration<TagListRecord>
{
    public void Configure(EntityTypeBuilder<TagListRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("tag_lists", "catalog");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(l => l.SeededAt).HasColumnName("seeded_at");
    }
}

/// <summary>Mapping of <see cref="TagRecord"/> to the table catalog.tags (ADR 0032).</summary>
public sealed class TagRecordConfiguration : IEntityTypeConfiguration<TagRecord>
{
    /// <summary>One tag of the list per name key; a removed tag frees its name (ADR 0032).</summary>
    public static readonly string NameKeyIndex = "ix_tags_name_key";

    public void Configure(EntityTypeBuilder<TagRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("tags", "catalog", table =>
        {
            table.HasCheckConstraint("ck_tags_name_length", $"char_length(name) <= {TagName.MaxLength}");
            table.HasCheckConstraint("ck_tags_name_key", "name_key <> ''");
            table.HasCheckConstraint("ck_tags_description", "description <> ''");
            table.HasCheckConstraint("ck_tags_description_length", $"char_length(description) <= {TagDescription.MaxLength}");
        });
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(t => t.Name).HasColumnName("name").IsRequired();
        builder.Property(t => t.NameKey).HasColumnName("name_key").IsRequired();
        builder.Property(t => t.Description).HasColumnName("description").IsRequired();
        builder.Property(t => t.ImpliedTagId).HasColumnName("implied_tag_id");
        builder.Property(t => t.RemovedAt).HasColumnName("removed_at");

        // Tags are removed logically, never deleted: the foreign key forbids any silent deletion.
        builder.HasOne<TagRecord>().WithMany().HasForeignKey(t => t.ImpliedTagId).HasConstraintName("fk_tags_implied_tag")
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(t => t.NameKey).HasDatabaseName(NameKeyIndex).IsUnique().HasFilter("removed_at IS NULL");
    }
}
