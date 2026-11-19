using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution.ProposePoseRevision;

internal sealed class ProposePoseRevisionHandler(
    IContributors contributors,
    ICatalogPoses catalogPoses,
    ICatalogPoseNames catalogPoseNames,
    IPoseProposalRepository poseProposals,
    IPoseRevisionProposalRepository revisions,
    IPoseReservation nameReservation,
    ICatalogPublisher catalogPublisher,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    ICatalogTags catalogTags) : ICommandHandler<ProposePoseRevision, PoseRevisionProposalDto>
{
    public async Task<Result<PoseRevisionProposalDto>> Handle(ProposePoseRevision command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var contributor = await contributors.Find(command.Contributor, ct);
        if (contributor is null) return ContributionErrors.UnknownContributor;
        var read = await catalogPoses.Find(command.Pose, ct);
        if (read.IsFailure) return read.Error!;

        // The domain tells which name key the revision reserves, if any (ADR 0025): read here only to know what to lock.
        var reservedKey = ProposedRevision.Of(read.Value!.Values, command.Changes) is { IsSuccess: true } revision ? revision.Value!.ReservedNameKey : null;
        return await nameReservation.Run(command.Pose, reservedKey, async transactionCt =>
        {
            // Read again once the pose is reserved: a revision published meanwhile is seen, and refused by the control of
            // the version it started from (ADR 0024), before its values are frozen as the values before this revision.
            var found = await catalogPoses.Find(command.Pose, transactionCt);
            if (found.IsFailure) return found.Error!;
            var pose = found.Value!;
            var alreadyPending = await revisions.ExistsPendingForPose(pose.Id, transactionCt);
            var availability = reservedKey is null
                ? Result<NameAvailability>.Success(NameAvailability.Available)
                : await NameAvailabilityOf(reservedKey, transactionCt);
            if (availability.IsFailure) return availability.Error!;
            // Story 9a: the tags, chosen for a pose by the list of the Catalog, inside the reservation (ADR 0036).
            var changes = command.Tags is null ? command.Changes : command.Changes.Tagged(await catalogTags.ChooseForPose(command.Tags, transactionCt));
            return await Submit(contributor, pose, command with { Changes = changes }, alreadyPending, availability.Value, transactionCt);
        }, ct);
    }

    private async Task<Result<NameAvailability>> NameAvailabilityOf(PoseNameKey key, CancellationToken ct)
    {
        var published = await catalogPoseNames.IsPublished(key, ct);
        if (published.IsFailure) return published.Error!;
        return Result<NameAvailability>.Success(NameAvailability.From(
            publishedInCatalog: published.Value,
            pendingProposal: await poseProposals.ExistsPendingWithNameKey(key, ct) || await revisions.ExistsPendingWithReservedNameKey(key, ct)));
    }

    private async Task<Result<PoseRevisionProposalDto>> Submit(
        Contributor contributor, PublishedPose pose, ProposePoseRevision command, bool revisionAlreadyPending, NameAvailability availability,
        CancellationToken ct)
    {
        var submitted = PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.CreateVersion7()), contributor, pose, command.StartedFrom, command.Changes, command.Message, revisionAlreadyPending, availability,
            clock.GetUtcNow());
        if (submitted.IsFailure) return submitted.Error!;

        var proposal = submitted.Value!;
        if (proposal.Decision is Acceptance acceptance)
        {
            // Direct publication, in the same transaction (ADR 0016, ADR 0026): if the Catalog refuses, nothing is saved. Same
            // path as an acceptance by a validator, from the version the revision started from (ADR 0024).
            var revised = await catalogPublisher.RevisePose(proposal.Id, proposal.Pose, proposal.BaseVersion, acceptance.Retained, ct);
            if (revised.IsFailure) return revised.Error!;
        }

        revisions.Add(proposal);
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        return Result<PoseRevisionProposalDto>.Success(new PoseRevisionProposalDto(proposal.Id, proposal.Status, proposal.Revision.After));
    }
}
