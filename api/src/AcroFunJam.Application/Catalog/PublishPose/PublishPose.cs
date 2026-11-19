using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.PublishPose;

/// <summary>
/// Publishes a pose in the catalog, from an accepted proposal (<paramref name="Source"/>) or not (Open Host Service of the
/// Catalog, ADR 0016), with its tags, chosen again by the list for a pose (story 9a, ADR 0036).
/// </summary>
public sealed record PublishPose(PoseName Name, Difficulty Difficulty, FlowBoundaries Flow, SourceProposalId? Source)
{
    public TagSet Tags { get; init; } = TagSet.Empty;
}
