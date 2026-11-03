using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>Expected errors of the Catalog context, with stable codes (ADR 0007).</summary>
public static class CatalogErrors
{
    public static readonly Error PoseNameTaken = new("catalog.pose-name-taken", "Une pose de ce nom existe déjà dans le catalogue.");
}
