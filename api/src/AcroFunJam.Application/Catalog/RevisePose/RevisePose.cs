using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.RevisePose;

/// <summary>
/// Revises a published pose with the retained values of a revision proposal, from the version it started from
/// (Open Host Service of the Catalog, story 6, ADR 0024, ADR 0026).
/// </summary>
public sealed record RevisePose(PoseId Pose, PoseName Name, Difficulty Difficulty, FlowBoundaries Flow, PoseVersion Expected, SourceProposalId Source)
{
    /// <summary>The retained tags (story 9a, ADR 0036), chosen again by the list for a pose; none keeps the tags of the pose.</summary>
    public TagSet? Tags { get; init; }
}
