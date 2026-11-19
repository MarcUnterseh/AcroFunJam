using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// Port (towards Contribution, ADR 0036): whether a revision of a published pose waits for a decision. Read by the page of a
/// pose, which tells it in advance, and by the direct tagging of the pose, refused meanwhile (story 9a, D4).
/// </summary>
public interface IPendingPoseRevisions
{
    Task<bool> IsPending(PoseId pose, CancellationToken ct);
}
