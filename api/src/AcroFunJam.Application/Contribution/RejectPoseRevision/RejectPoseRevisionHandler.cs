using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution.AcceptPoseRevision;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.RejectPoseRevision;

internal sealed class RejectPoseRevisionHandler(
    IValidators validators,
    IPoseRevisionProposalRepository revisions,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<RejectPoseRevision, DecidedPoseRevisionDto>
{
    public async Task<Result<DecidedPoseRevisionDto>> Handle(RejectPoseRevision command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var validator = await validators.Find(command.By, ct);
        if (validator is null) return ContributionErrors.UnknownValidator;

        var proposal = await revisions.GetById(command.Proposal, ct);
        if (proposal is null) return ContributionErrors.ProposalNotFound;

        var rejected = proposal.Reject(validator, command.Reason, clock.GetUtcNow());
        if (rejected.IsFailure) return rejected.Error!;

        // Nothing is written in the catalog: no reservation, a single save, conditional on the revision still being pending (ADR 0022).
        revisions.Update(proposal);
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        return Result<DecidedPoseRevisionDto>.Success(new DecidedPoseRevisionDto(proposal.Id, proposal.Status, Retained: null, HasAdjustments: false));
    }
}
