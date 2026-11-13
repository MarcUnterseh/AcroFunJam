using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>The concurrency conflicts of the catalog schema and the business error each one means (ADR 0024).</summary>
public static class CatalogConcurrencyConflicts
{
    public static readonly ConcurrencyConflictError PoseRevisedMeanwhile = new(typeof(PoseRecord), CatalogErrors.PoseVersionMismatch);
}
