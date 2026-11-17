using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.PublishTransition;

/// <summary>
/// Publishes a transition in the catalog, from an accepted proposal (<paramref name="Source"/>) or not (Open Host Service of the
/// Catalog, story 7, ADR 0028).
/// </summary>
public sealed record PublishTransition(
    PoseId FromPose, PoseId ToPose, TransitionName? Name, Difficulty Difficulty, TransitionDescription? Description, SourceProposalId? Source,
    IReadOnlyCollection<TagId> Tags);
