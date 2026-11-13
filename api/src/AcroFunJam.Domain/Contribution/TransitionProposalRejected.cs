using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>A validator rejected a transition proposal, with a reason: nothing is published and its place is free again.</summary>
public sealed record TransitionProposalRejected(
    TransitionProposalId ProposalId, ValidatorId RejectedBy, RejectionReason Reason, DateTimeOffset OccurredAt) : IDomainEvent;
