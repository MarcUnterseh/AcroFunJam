using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.AcceptPoseProposal;

internal sealed class AcceptPoseProposalHandler(
    IValidators validators,
    IPoseProposalRepository proposals,
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

        var proposal = await proposals.GetById(command.Proposal, ct);
        if (proposal is null) return ContributionErrors.ProposalNotFound;

        // Publishing writes the name: inside its reservation, committed only if every step succeeds (ADR 0017, ADR 0022).
        return await nameReservation.Run(proposal.Pose.Name.Key, async transactionCt =>
        {
            var accepted = proposal.Accept(validator, clock.GetUtcNow());
            if (accepted.IsFailure) return accepted.Error!;

            // The decision is claimed before publishing: a concurrent decision fails here as "already decided".
            proposals.Update(proposal);
            var saved = await unitOfWork.SaveChanges(transactionCt);
            if (saved.IsFailure) return saved.Error!;

            var publication = await catalogPublisher.PublishPose(proposal.Id, proposal.Pose, transactionCt);
            if (publication.IsFailure) return publication.Error!;
            return Result<DecidedPoseProposalDto>.Success(new DecidedPoseProposalDto(proposal.Id, proposal.Status, proposal.Pose));
        }, ct);
    }
}
