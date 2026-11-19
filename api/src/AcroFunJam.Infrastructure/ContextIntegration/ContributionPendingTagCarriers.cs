using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution.GetPendingPoseProposalsCarryingTag;
using AcroFunJam.Application.Contribution.GetPendingPoseRevisionsCarryingTag;
using AcroFunJam.Application.Contribution.GetPendingTransitionProposalsCarryingTag;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// Anti-corruption layer Catalog → Contribution (ADR 0033): the pending proposals carrying a tag, read when it is removed, translated
/// into the language of the Catalog (its pose identifiers).
/// </summary>
public sealed class ContributionPendingTagCarriers(
    IQueryHandler<GetPendingTransitionProposalsCarryingTag, IReadOnlyList<TransitionProposal>> pending,
    IQueryHandler<GetPendingPoseProposalsCarryingTag, IReadOnlyList<PoseProposal>> pendingPoses,
    IQueryHandler<GetPendingPoseRevisionsCarryingTag, IReadOnlyList<PoseRevisionProposal>> pendingRevisions) : IPendingTagCarriers
{
    /// <summary>
    /// Story 9a: the pending pose proposals, under the name of their proposed pose, and the pending revisions, under the name the pose
    /// had (as the validation queue knows them, ADR 0027).
    /// </summary>
    public async Task<IReadOnlyList<CarryingPendingPose>> PosesCarrying(TagId tag, CancellationToken ct) =>
    [
        .. (await pendingPoses.Handle(new GetPendingPoseProposalsCarryingTag(tag), ct)).Value!.Select(p => new CarryingPendingPose(
            p.Id.Value, PendingPoseKind.Proposal, p.Pose.Name)),
        .. (await pendingRevisions.Handle(new GetPendingPoseRevisionsCarryingTag(tag), ct)).Value!.Select(r => new CarryingPendingPose(
            r.Id.Value, PendingPoseKind.Revision, r.QueuedName)),
    ];

    public async Task<IReadOnlyList<PendingTagCarrier>> ProposalsCarrying(TagId tag, CancellationToken ct) =>
        [.. (await pending.Handle(new GetPendingTransitionProposalsCarryingTag(tag), ct)).Value!.Select(p => new PendingTagCarrier(
            p.Id.Value, new Domain.Catalog.PoseId(p.Poses.From.Value), new Domain.Catalog.PoseId(p.Poses.To.Value), p.Proposed.Name))];
}
