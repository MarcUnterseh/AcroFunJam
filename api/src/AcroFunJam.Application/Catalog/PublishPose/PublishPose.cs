using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.PublishPose;

/// <summary>
/// Publishes a pose in the catalog, from an accepted proposal (<paramref name="Source"/>) or not
/// (Open Host Service of the Catalog, ADR 0016).
/// </summary>
public sealed record PublishPose(PoseName Name, Difficulty Difficulty, FlowBoundaries Flow, SourceProposalId? Source);
