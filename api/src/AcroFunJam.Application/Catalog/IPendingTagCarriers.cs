using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>A proposal pending validation carrying a tag: its identifier, its poses and its optional name (ADR 0033).</summary>
public sealed record PendingTagCarrier(Guid Id, PoseId FromPose, PoseId ToPose, TransitionName? Name);

/// <summary>
/// Port (towards Contribution, ADR 0033): the transition proposals pending validation that carry a tag, read when it is removed.
/// A narrow, read-only relation, implemented by an adapter of the context integration.
/// </summary>
public interface IPendingTagCarriers
{
    Task<IReadOnlyList<PendingTagCarrier>> ProposalsCarrying(TagId tag, CancellationToken ct);
}
