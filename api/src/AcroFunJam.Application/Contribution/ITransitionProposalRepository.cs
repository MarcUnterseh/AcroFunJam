using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution;

/// <summary>Port: stores the transition proposals (saved by <see cref="Common.IUnitOfWork"/>, story 7, ADR 0028).</summary>
public interface ITransitionProposalRepository
{
    void Add(TransitionProposal proposal);

    /// <summary>Saves the decision on a proposal, only if it is still pending in storage (ADR 0022).</summary>
    void Update(TransitionProposal proposal);

    /// <summary>The transition proposal with this identifier, if any.</summary>
    Task<TransitionProposal?> GetById(TransitionProposalId id, CancellationToken ct);

    /// <summary>Whether a pending transition proposal takes this place between its poses (ADR 0029).</summary>
    Task<bool> ExistsPendingInSlot(TransitionSlot slot, CancellationToken ct);

    /// <summary>Same, the given proposal left out: the place a proposal takes itself does not prevent accepting it.</summary>
    Task<bool> ExistsOtherPendingInSlot(TransitionSlot slot, TransitionProposalId except, CancellationToken ct);
}
