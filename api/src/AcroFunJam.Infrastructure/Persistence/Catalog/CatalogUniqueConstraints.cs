using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>The unique constraints of the catalog schema and the business error each one means.</summary>
public static class CatalogUniqueConstraints
{
    public static readonly UniqueConstraintError PoseNameKey = new(PoseRecordConfiguration.NameKeyIndex, CatalogErrors.PoseNameTaken);

    /// <summary>A name between two poses taken by a published transition (ADR 0029).</summary>
    public static readonly UniqueConstraintError TransitionNamedSlot = new(TransitionRecordConfiguration.NamedSlotIndex, CatalogErrors.TransitionNameTaken);

    /// <summary>The unnamed place between two poses taken by a published transition (ADR 0029).</summary>
    public static readonly UniqueConstraintError TransitionUnnamedSlot =
        new(TransitionRecordConfiguration.UnnamedSlotIndex, CatalogErrors.UnnamedTransitionTaken);
}
