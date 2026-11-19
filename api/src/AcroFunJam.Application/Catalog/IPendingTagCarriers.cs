using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>A proposal pending validation carrying a tag: its identifier, its poses and its optional name (ADR 0033).</summary>
public sealed record PendingTagCarrier(Guid Id, PoseId FromPose, PoseId ToPose, TransitionName? Name);

/// <summary>
/// Port (towards Contribution, ADR 0033, ADR 0036): the proposals pending validation that carry a tag, read when it is removed or
/// stops applying somewhere. A narrow, read-only relation, implemented by an adapter of the context integration.
/// </summary>
public interface IPendingTagCarriers
{
    /// <summary>The pending transition proposals carrying the tag.</summary>
    Task<IReadOnlyList<PendingTagCarrier>> ProposalsCarrying(TagId tag, CancellationToken ct);

    /// <summary>The pending proposals about a pose carrying the tag (story 9a): new poses and revisions, in any order.</summary>
    Task<IReadOnlyList<CarryingPendingPose>> PosesCarrying(TagId tag, CancellationToken ct);
}
