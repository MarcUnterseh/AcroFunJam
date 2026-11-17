using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.ProposeTransition;

internal sealed class ProposeTransitionHandler(
    IContributors contributors,
    ICatalogPoses catalogPoses,
    ICatalogTransitions catalogTransitions,
    ITransitionProposalRepository proposals,
    ITransitionReservation reservation,
    ICatalogPublisher catalogPublisher,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    ICatalogTags catalogTags) : ICommandHandler<ProposeTransition, TransitionProposalDto>
{
    public async Task<Result<TransitionProposalDto>> Handle(ProposeTransition command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var contributor = await contributors.Find(command.Contributor, ct);
        if (contributor is null) return ContributionErrors.UnknownContributor;

        // The place is checked and taken while the couple of poses is reserved (ADR 0029).
        return await reservation.Run(command.Poses, transactionCt => Submit(contributor, command, transactionCt), ct);
    }

    private async Task<Result<TransitionProposalDto>> Submit(Contributor contributor, ProposeTransition command, CancellationToken ct)
    {
        // The current names of both poses, in one batch: a pose missing from them is not published (R4); the aggregate decides.
        var poses = command.Poses;
        var names = await catalogPoses.NamesOf([poses.From, poses.To], ct);
        if (names.IsFailure) return names.Error!;
        var published = names.Value!;
        var slot = await SlotAvailability(TransitionSlot.Of(poses, command.Transition.Name), ct);
        if (slot.IsFailure) return slot.Error!;
        // Chosen through the list inside the reservation, which holds the list shared: no tag is removed meanwhile (ADR 0033).
        var tags = await catalogTags.Choose(command.Tags ?? [], ct);

        var submitted = TransitionProposal.Submit(
            new TransitionProposalId(Guid.CreateVersion7()), contributor, poses, command.Transition,
            published.ContainsKey(poses.From), published.ContainsKey(poses.To), slot.Value, clock.GetUtcNow(), tags);
        if (submitted.IsFailure) return submitted.Error!;

        var proposal = submitted.Value!;
        if (proposal.Decision is TransitionAcceptance acceptance)
        {
            // Direct publication, in the same transaction (ADR 0016, ADR 0028): if the Catalog refuses, nothing is saved.
            var publication = await catalogPublisher.PublishTransition(proposal.Id, poses, acceptance.Retained, ct);
            if (publication.IsFailure) return publication.Error!;
        }

        proposals.Add(proposal);
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        return Result<TransitionProposalDto>.Success(new TransitionProposalDto(
            proposal.Id, proposal.Status, poses, published[poses.From], published[poses.To], proposal.Proposed));
    }

    /// <summary>The place in the catalog and among the pending proposals; the catalog prevails.</summary>
    private async Task<Result<TransitionSlotAvailability>> SlotAvailability(TransitionSlot slot, CancellationToken ct)
    {
        var inCatalog = await catalogTransitions.IsSlotTaken(slot, ct);
        if (inCatalog.IsFailure) return inCatalog.Error!;
        return Result<TransitionSlotAvailability>.Success(TransitionSlotAvailability.From(
            publishedInCatalog: inCatalog.Value, pendingProposal: await proposals.ExistsPendingInSlot(slot, ct)));
    }
}
