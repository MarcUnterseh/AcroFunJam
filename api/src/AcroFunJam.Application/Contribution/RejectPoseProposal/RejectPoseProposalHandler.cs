using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.RejectPoseProposal;

internal sealed class RejectPoseProposalHandler(
    IValidators validators,
    IPoseProposalRepository proposals,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<RejectPoseProposal, DecidedPoseProposalDto>
{
    public async Task<Result<DecidedPoseProposalDto>> Handle(RejectPoseProposal command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var validator = await validators.Find(command.By, ct);
        if (validator is null) return ContributionErrors.UnknownValidator;

        var proposal = await proposals.GetById(command.Proposal, ct);
        if (proposal is null) return ContributionErrors.ProposalNotFound;

        var rejected = proposal.Reject(validator, command.Reason, clock.GetUtcNow());
        if (rejected.IsFailure) return rejected.Error!;

        // No name is written: no reservation, a single save, conditional on the proposal still being pending (ADR 0022).
        proposals.Update(proposal);
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        return Result<DecidedPoseProposalDto>.Success(new DecidedPoseProposalDto(proposal.Id, proposal.Status, proposal.Pose));
    }
}
