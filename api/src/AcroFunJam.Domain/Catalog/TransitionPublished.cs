using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A transition has been published in the catalog, from a proposal or not (story 7, ADR 0028).</summary>
public sealed record TransitionPublished(
    TransitionId TransitionId, PoseId FromPose, PoseId ToPose, TransitionName? Name, SourceProposalId? SourceProposalId, DateTimeOffset OccurredAt)
    : IDomainEvent;
