using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>A contributor proposed a transition between two published poses.</summary>
public sealed record TransitionProposed(
    TransitionProposalId ProposalId, ContributorId Contributor, TransitionPoses Poses, TransitionName? Name, DateTimeOffset OccurredAt) : IDomainEvent;
