using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution.AcceptTransitionProposal;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.RejectTransitionProposal;

internal sealed class RejectTransitionProposalHandler(
    IValidators validators,
    ITransitionProposalRepository proposals,
    ICatalogPoses catalogPoses,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<RejectTransitionProposal, DecidedTransitionProposalDto>
{
    public async Task<Result<DecidedTransitionProposalDto>> Handle(RejectTransitionProposal command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var validator = await validators.Find(command.By, ct);
        if (validator is null) return ContributionErrors.UnknownValidator;

        var proposal = await proposals.GetById(command.Proposal, ct);
        if (proposal is null) return ContributionErrors.ProposalNotFound;

        var rejected = proposal.Reject(validator, command.Reason, clock.GetUtcNow());
        if (rejected.IsFailure) return rejected.Error!;

        // Nothing is written in the catalog: no reservation, a single save, conditional on the proposal still being pending (ADR 0022).
        proposals.Update(proposal);
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;

        var names = await catalogPoses.NamesOf([proposal.Poses.From, proposal.Poses.To], ct);
        if (names.IsFailure) return names.Error!;
        return Result<DecidedTransitionProposalDto>.Success(new DecidedTransitionProposalDto(
            proposal.Id, proposal.Status, proposal.Poses, names.Value![proposal.Poses.From], names.Value[proposal.Poses.To], Retained: null,
            HasAdjustments: false));
    }
}
