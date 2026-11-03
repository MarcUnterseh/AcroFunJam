using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.ProposePose;

internal sealed class ProposePoseHandler(
    IContributors contributors,
    ICatalogPoseNames catalogPoseNames,
    IPoseProposalRepository proposals,
    ICatalogPublisher catalogPublisher,
    IPoseNameReservation nameReservation,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : ICommandHandler<ProposePose, PoseProposalDto>
{
    public async Task<Result<PoseProposalDto>> Handle(ProposePose command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var contributor = await contributors.Find(command.Contributor, ct);
        if (contributor is null) return ContributionErrors.UnknownContributor;

        var key = command.Pose.Name.Key;
        return await nameReservation.Run(key, async transactionCt =>
        {
            // The handler gathers the facts; the aggregate decides what they mean (ADR 0017).
            var published = await catalogPoseNames.IsPublished(key, transactionCt);
            if (published.IsFailure) return published.Error!;
            var availability = NameAvailability.From(
                publishedInCatalog: published.Value,
                pendingProposal: await proposals.ExistsPendingWithNameKey(key, transactionCt));
            var submitted = PoseProposal.Submit(
                new PoseProposalId(Guid.CreateVersion7()), contributor, command.Pose, availability, clock.GetUtcNow());
            if (submitted.IsFailure) return submitted.Error!;

            var proposal = submitted.Value!;
            if (proposal.IsAccepted)
            {
                // Direct publication, in the same transaction (ADR 0016): if the Catalog refuses, nothing is saved.
                var publication = await catalogPublisher.PublishPose(proposal.Id, proposal.Pose, transactionCt);
                if (publication.IsFailure) return publication.Error!;
            }

            proposals.Add(proposal);
            var saved = await unitOfWork.SaveChanges(transactionCt);
            if (saved.IsFailure) return saved.Error!;
            return Result<PoseProposalDto>.Success(new PoseProposalDto(proposal.Id, proposal.Status, proposal.Pose));
        }, ct);
    }
}
