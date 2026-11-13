using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A transition proposal was accepted by a validator, hence its retained transition published, with or without adjustments. For
/// a direct publication, it is accepted at once by its own contributor, acting as validator (<paramref name="AcceptedBy"/>).
/// </summary>
public sealed record TransitionProposalAccepted(
    TransitionProposalId ProposalId, ValidatorId AcceptedBy, bool WithAdjustments, DateTimeOffset OccurredAt) : IDomainEvent;
