using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.GetPosePage;

/// <summary>
/// Read port: the published transitions from and to a pose, each with the current name of its other pose (ADR 0030), in any
/// order (the domain orders them).
/// </summary>
public interface IPoseTransitionsReader
{
    Task<IReadOnlyList<LinkedTransition>> TransitionsFrom(PoseId pose, CancellationToken ct);

    Task<IReadOnlyList<LinkedTransition>> TransitionsTo(PoseId pose, CancellationToken ct);
}
