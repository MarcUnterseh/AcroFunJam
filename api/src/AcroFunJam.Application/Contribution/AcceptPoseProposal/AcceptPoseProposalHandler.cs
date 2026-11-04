using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.AcceptPoseProposal;

internal sealed class AcceptPoseProposalHandler(
    IValidators validators,
    IPoseProposalRepository proposals,
    ICatalogPoseNames catalogPoseNames,
    IPoseNameReservation nameReservation,
    ICatalogPublisher catalogPublisher,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<AcceptPoseProposal, DecidedPoseProposalDto>
{
    public async Task<Result<DecidedPoseProposalDto>> Handle(AcceptPoseProposal command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var validator = await validators.Find(command.By, ct);
        if (validator is null) return ContributionErrors.UnknownValidator;

        var proposed = await proposals.GetById(command.Proposal, ct);
        if (proposed is null) return ContributionErrors.ProposalNotFound;

        // Publishing writes the retained name: inside its reservation, committed only if every step succeeds (ADR 0017, ADR 0022).
        // The retained pose is computed here only to know which name to reserve.
        var key = proposed.Pose.Retain(command.Adjustments).Name.Key;
        return await nameReservation.Run(key, async transactionCt =>
        {
            // Read again inside the reservation: a decision committed meanwhile by a use case holding the same name is
            // seen, and refused as already decided before the name is found published (ADR 0022).
            var proposal = await proposals.GetById(command.Proposal, transactionCt);
            if (proposal is null) return ContributionErrors.ProposalNotFound;
            // From the proposal read again: the retained pose is that of the proposal being decided.
            var retained = proposal.Pose.Retain(command.Adjustments);

            // The handler gathers the facts on the retained name, the proposal itself left out; the aggregate decides (ADR 0017).
            var published = await catalogPoseNames.IsPublished(key, transactionCt);
            if (published.IsFailure) return published.Error!;
            var availability = NameAvailability.From(
                publishedInCatalog: published.Value,
                pendingProposal: await proposals.ExistsOtherPendingWithNameKey(key, proposal.Id, transactionCt));

            var accepted = proposal.Accept(validator, retained, command.Note, availability, clock.GetUtcNow());
            if (accepted.IsFailure) return accepted.Error!;
            var acceptance = accepted.Value!;

            // The decision is claimed before publishing: a concurrent decision fails here as "already decided".
            proposals.Update(proposal);
            var saved = await unitOfWork.SaveChanges(transactionCt);
            if (saved.IsFailure) return saved.Error!;

            var publication = await catalogPublisher.PublishPose(proposal.Id, acceptance.Retained, transactionCt);
            if (publication.IsFailure) return publication.Error!;
            return Result<DecidedPoseProposalDto>.Success(
                new DecidedPoseProposalDto(proposal.Id, proposal.Status, acceptance.Retained, acceptance.HasAdjustments));
        }, ct);
    }
}
