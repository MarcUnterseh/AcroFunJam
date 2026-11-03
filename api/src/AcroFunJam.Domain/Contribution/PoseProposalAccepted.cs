using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A pose proposal was accepted, hence its pose published. For a direct publication, it is accepted at once by
/// its own contributor (<paramref name="AcceptedBy"/>).
/// </summary>
public sealed record PoseProposalAccepted(PoseProposalId ProposalId, ContributorId AcceptedBy, DateTimeOffset OccurredAt) : IDomainEvent;
