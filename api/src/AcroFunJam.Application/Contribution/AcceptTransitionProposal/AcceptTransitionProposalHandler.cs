using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.AcceptTransitionProposal;

internal sealed class AcceptTransitionProposalHandler(
    IValidators validators,
    ITransitionProposalRepository proposals,
    ICatalogPoses catalogPoses,
    ICatalogTransitions catalogTransitions,
    ITransitionReservation reservation,
    ICatalogPublisher catalogPublisher,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<AcceptTransitionProposal, DecidedTransitionProposalDto>
{
    public async Task<Result<DecidedTransitionProposalDto>> Handle(AcceptTransitionProposal command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var validator = await validators.Find(command.By, ct);
        if (validator is null) return ContributionErrors.UnknownValidator;

        var read = await proposals.GetById(command.Proposal, ct);
        if (read is null) return ContributionErrors.ProposalNotFound;

        // Publishing takes a place between the poses: inside the reservation of the couple, committed only if every step succeeds
        // (ADR 0022, ADR 0029).
        return await reservation.Run(read.Poses, async transactionCt =>
        {
            // Read again inside the reservation: a decision committed meanwhile is seen, and refused as already decided.
            var proposal = await proposals.GetById(command.Proposal, transactionCt);
            if (proposal is null) return ContributionErrors.ProposalNotFound;

            var slot = await RetainedSlotAvailability(proposal, proposal.SlotIfAccepted(command.Adjustments), transactionCt);
            if (slot.IsFailure) return slot.Error!;
            var accepted = proposal.Accept(validator, command.Adjustments, command.Note, slot.Value, clock.GetUtcNow());
            if (accepted.IsFailure) return accepted.Error!;
            var acceptance = accepted.Value!;

            // The decision is claimed before publishing: a concurrent decision fails here as "already decided" (ADR 0022).
            proposals.Update(proposal);
            var saved = await unitOfWork.SaveChanges(transactionCt);
            if (saved.IsFailure) return saved.Error!;

            var published = await catalogPublisher.PublishTransition(proposal.Id, proposal.Poses, acceptance.Retained, transactionCt);
            if (published.IsFailure) return published.Error!;
            return await Decided(proposal, acceptance, transactionCt);
        }, ct);
    }

    /// <summary>The place of the retained transition in the catalog and among the other pending proposals; the catalog prevails.</summary>
    private async Task<Result<TransitionSlotAvailability>> RetainedSlotAvailability(TransitionProposal proposal, TransitionSlot slot, CancellationToken ct)
    {
        var inCatalog = await catalogTransitions.IsSlotTaken(slot, ct);
        if (inCatalog.IsFailure) return inCatalog.Error!;
        return Result<TransitionSlotAvailability>.Success(TransitionSlotAvailability.From(
            publishedInCatalog: inCatalog.Value, pendingProposal: await proposals.ExistsOtherPendingInSlot(slot, proposal.Id, ct)));
    }

    private async Task<Result<DecidedTransitionProposalDto>> Decided(TransitionProposal proposal, TransitionAcceptance acceptance, CancellationToken ct)
    {
        var names = await catalogPoses.NamesOf([proposal.Poses.From, proposal.Poses.To], ct);
        if (names.IsFailure) return names.Error!;
        return Result<DecidedTransitionProposalDto>.Success(new DecidedTransitionProposalDto(
            proposal.Id, proposal.Status, proposal.Poses, names.Value![proposal.Poses.From], names.Value[proposal.Poses.To], acceptance.Retained,
            acceptance.HasAdjustments));
    }
}
