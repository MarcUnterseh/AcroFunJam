using AcroFunJam.Application.Catalog.IsPoseNamePublished;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>Anti-corruption layer Contribution → Catalog (ADR 0016): asks the Catalog whether a name key is published.</summary>
public sealed class CatalogPoseNames(IQueryHandler<IsPoseNamePublished, bool> isPoseNamePublished) : ICatalogPoseNames
{
    // A failure of the Catalog is passed on: reading it as "not published" would let a duplicate through.
    public Task<Result<bool>> IsPublished(PoseNameKey key, CancellationToken ct) =>
        isPoseNamePublished.Handle(new IsPoseNamePublished(key), ct);
}
