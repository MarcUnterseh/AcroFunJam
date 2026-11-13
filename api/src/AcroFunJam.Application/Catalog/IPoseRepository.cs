using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>Port: stores the published poses (saved by <see cref="Common.IUnitOfWork"/>).</summary>
public interface IPoseRepository
{
    void Add(Pose pose);

    /// <summary>The published pose with this identifier, if any.</summary>
    Task<Pose?> GetById(PoseId id, CancellationToken ct);

    /// <summary>Saves a revised pose, only if it is still at the version it was read at (ADR 0024).</summary>
    void Update(Pose pose);

    /// <summary>Whether a published pose already has this name key.</summary>
    Task<bool> IsNameTaken(PoseNameKey key, CancellationToken ct);
}
