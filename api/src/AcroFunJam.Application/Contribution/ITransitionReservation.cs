using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>
/// Port: runs a use case that takes a place between two poses in one transaction, serialised with every other use case taking
/// a place between the same start pose and end pose, and committed only if it succeeds (ADR 0029). A uniqueness violation
/// detected by the database is returned as the matching business error.
/// </summary>
public interface ITransitionReservation
{
    Task<Result<T>> Run<T>(TransitionPoses poses, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct);
}
