using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>The unique constraints of the catalog schema and the business error each one means.</summary>
public static class CatalogUniqueConstraints
{
    public static readonly UniqueConstraintError PoseNameKey = new(PoseRecordConfiguration.NameKeyIndex, CatalogErrors.PoseNameTaken);
}
