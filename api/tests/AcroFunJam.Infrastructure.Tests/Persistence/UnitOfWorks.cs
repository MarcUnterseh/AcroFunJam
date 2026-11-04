using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using AcroFunJam.Infrastructure.Persistence.Contribution;

namespace AcroFunJam.Infrastructure.Tests.Persistence;

/// <summary>The unit of work as the composition root wires it: with the unique constraints and concurrency conflicts of every context.</summary>
internal static class UnitOfWorks
{
    public static EfUnitOfWork For(AcroFunJamDbContext context, TrackedAggregates aggregates) =>
        new(
            context,
            aggregates,
            [CatalogUniqueConstraints.PoseNameKey, ContributionUniqueConstraints.PendingPoseNameKey],
            [ContributionConcurrencyConflicts.PoseProposalDecided]);
}
