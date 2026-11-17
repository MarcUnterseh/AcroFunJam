using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution.ProposeTransition;

/// <summary>A contributor proposes a transition from a published pose to a published pose (story 7, ADR 0028).</summary>
public sealed record ProposeTransition(
    ContributorId Contributor, TransitionPoses Poses, ProposedTransition Transition, IReadOnlyCollection<TagId>? Tags = null);

/// <summary>The received transition proposal: its status, its poses with their current names, and the transition as proposed.</summary>
public sealed record TransitionProposalDto(
    TransitionProposalId Id, ProposalStatus Status, TransitionPoses Poses, PoseName FromPoseName, PoseName ToPoseName, ProposedTransition Transition);
