using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution;

/// <summary>
/// Port: runs a use case that takes a pose name in one transaction, serialised with every other use case taking
/// the same name key, and committed only if it succeeds (ADR 0017). A uniqueness violation detected by the
/// database is returned as the matching business error.
/// </summary>
public interface IPoseNameReservation
{
    Task<Result<T>> Run<T>(PoseNameKey key, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct);
}
