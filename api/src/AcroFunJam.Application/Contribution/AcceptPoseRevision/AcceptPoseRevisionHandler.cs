using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution.AcceptPoseRevision;

internal sealed class AcceptPoseRevisionHandler(
    IValidators validators,
    IPoseRevisionProposalRepository revisions,
    ICatalogPoseNames catalogPoseNames,
    IPoseProposalRepository poseProposals,
    IPoseReservation reservation,
    ICatalogPublisher catalogPublisher,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<AcceptPoseRevision, DecidedPoseRevisionDto>
{
    public async Task<Result<DecidedPoseRevisionDto>> Handle(AcceptPoseRevision command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var validator = await validators.Find(command.By, ct);
        if (validator is null) return ContributionErrors.UnknownValidator;

        var read = await revisions.GetById(command.Proposal, ct);
        if (read is null) return ContributionErrors.ProposalNotFound;

        // Revising writes the pose, and its retained name when its key changes: inside their reservation, committed only if
        // every step succeeds (ADR 0022, ADR 0025). The domain tells which name key to reserve, if any.
        var key = read.NameKeyToReserve(command.Adjustments);
        return await reservation.Run(read.Pose, key, async transactionCt =>
        {
            // Read again inside the reservation: a decision committed meanwhile is seen, and refused as already decided.
            var proposal = await revisions.GetById(command.Proposal, transactionCt);
            if (proposal is null) return ContributionErrors.ProposalNotFound;

            var availability = key is null ? Result<NameAvailability>.Success(NameAvailability.Available) : await NameAvailabilityOf(proposal, key, transactionCt);
            if (availability.IsFailure) return availability.Error!;
            var accepted = proposal.Accept(validator, command.Adjustments, command.Note, availability.Value, clock.GetUtcNow());
            if (accepted.IsFailure) return accepted.Error!;
            var acceptance = accepted.Value!;

            // The decision is claimed before revising: a concurrent decision fails here as "already decided" (ADR 0022).
            revisions.Update(proposal);
            var saved = await unitOfWork.SaveChanges(transactionCt);
            if (saved.IsFailure) return saved.Error!;

            var revised = await catalogPublisher.RevisePose(proposal.Id, proposal.Pose, proposal.BaseVersion, acceptance.Retained, transactionCt);
            if (revised.IsFailure) return revised.Error!;
            return Result<DecidedPoseRevisionDto>.Success(
                new DecidedPoseRevisionDto(proposal.Id, proposal.Status, acceptance.Retained, acceptance.HasAdjustments));
        }, ct);
    }

    /// <summary>
    /// The retained name is unique against the catalog, the pending pose proposals and the names reserved by the other pending
    /// revisions: the name this revision reserves itself is left out (ADR 0025).
    /// </summary>
    private async Task<Result<NameAvailability>> NameAvailabilityOf(PoseRevisionProposal proposal, PoseNameKey key, CancellationToken ct)
    {
        var published = await catalogPoseNames.IsPublished(key, ct);
        if (published.IsFailure) return published.Error!;
        var reservedByAnother = await revisions.ExistsOtherPendingWithReservedNameKey(key, proposal.Id, ct);
        return Result<NameAvailability>.Success(NameAvailability.From(
            publishedInCatalog: published.Value,
            pendingProposal: reservedByAnother || await poseProposals.ExistsPendingWithNameKey(key, ct)));
    }
}
