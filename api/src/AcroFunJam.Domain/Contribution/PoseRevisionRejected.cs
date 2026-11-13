using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>A validator rejected a revision proposal, with a reason: the pose stays as it is (story 6, ADR 0026).</summary>
public sealed record PoseRevisionRejected(
    PoseRevisionProposalId ProposalId, ValidatorId RejectedBy, RejectionReason Reason, DateTimeOffset OccurredAt) : IDomainEvent;
