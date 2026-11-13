using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution.AcceptTransitionProposal;

/// <summary>
/// A validator accepts a transition proposal, possibly with adjustments of its name, difficulties and description, and a note
/// (story 7, R15 to R18): the retained transition is published in the catalog.
/// </summary>
public sealed record AcceptTransitionProposal(TransitionProposalId Proposal, ValidatorId By, TransitionAdjustments Adjustments, AdjustmentNote? Note);

/// <summary>
/// The decided transition proposal: its status, its poses under their current names and, once accepted, the retained transition
/// and whether it was adjusted.
/// </summary>
public sealed record DecidedTransitionProposalDto(
    TransitionProposalId Id, ProposalStatus Status, TransitionPoses Poses, PoseName FromPoseName, PoseName ToPoseName, RetainedTransition? Retained,
    bool HasAdjustments);
