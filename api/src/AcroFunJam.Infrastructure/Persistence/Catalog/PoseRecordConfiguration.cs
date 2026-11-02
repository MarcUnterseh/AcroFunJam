using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>Mapping of <see cref="PoseRecord"/> to the table catalog.poses.</summary>
public sealed class PoseRecordConfiguration : IEntityTypeConfiguration<PoseRecord>
{
    public void Configure(EntityTypeBuilder<PoseRecord> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("poses", "catalog");
        builder.HasKey(pose => pose.Id);
        builder.Property(pose => pose.Id).HasColumnName("id");
        builder.Property(pose => pose.Name).HasColumnName("name").IsRequired();
        builder.Property(pose => pose.BaseDifficulty).HasColumnName("base_difficulty").IsRequired();
        builder.Property(pose => pose.FlyerDifficulty).HasColumnName("flyer_difficulty").IsRequired();
    }
}
