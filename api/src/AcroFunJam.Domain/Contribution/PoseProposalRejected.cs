using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>A validator rejected a pose proposal, with a reason: nothing is published and its name is free again.</summary>
public sealed record PoseProposalRejected(
    PoseProposalId ProposalId, ValidatorId RejectedBy, RejectionReason Reason, DateTimeOffset OccurredAt) : IDomainEvent;
