using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A pose proposal was accepted by a validator, hence its retained pose published, with or without adjustments. For a
/// direct publication, it is accepted at once by its own contributor, acting as validator (<paramref name="AcceptedBy"/>).
/// </summary>
public sealed record PoseProposalAccepted(
    PoseProposalId ProposalId, ValidatorId AcceptedBy, bool WithAdjustments, DateTimeOffset OccurredAt) : IDomainEvent;
