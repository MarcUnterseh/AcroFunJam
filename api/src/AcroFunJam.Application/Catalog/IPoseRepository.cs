using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>Port: stores the published poses (saved by <see cref="Common.IUnitOfWork"/>).</summary>
public interface IPoseRepository
{
    void Add(Pose pose);

    /// <summary>Whether a published pose already has this name key.</summary>
    Task<bool> IsNameTaken(PoseNameKey key, CancellationToken ct);
}
