using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>A contributor proposed a new pose.</summary>
public sealed record PoseProposed(PoseProposalId ProposalId, ContributorId Contributor, PoseName Name, DateTimeOffset OccurredAt) : IDomainEvent;
