using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>A revision proposal was accepted, hence the pose revised with the retained revision (story 6, ADR 0026).</summary>
public sealed record PoseRevisionAccepted(
    PoseRevisionProposalId ProposalId, ValidatorId AcceptedBy, bool WithAdjustments, DateTimeOffset OccurredAt) : IDomainEvent;
