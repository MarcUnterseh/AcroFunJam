using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port (anti-corruption layer towards Catalog): whether a published pose already has this name key.</summary>
public interface ICatalogPoseNames
{
    /// <returns>Whether the key is published, or the failure of the Catalog (never read as "not published").</returns>
    Task<Result<bool>> IsPublished(PoseNameKey key, CancellationToken ct);
}
