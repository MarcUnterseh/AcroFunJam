using System.Security.Claims;
using AcroFunJam.Api.Authorization;
using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution.AcceptPoseRevision;
using AcroFunJam.Application.Contribution.GetPendingPoseProposals;
using AcroFunJam.Application.Contribution.GetPendingRevisionOfPose;
using AcroFunJam.Application.Contribution.ProposePoseRevision;
using AcroFunJam.Application.Contribution.RejectPoseRevision;
using AcroFunJam.Domain.Contribution;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AcroFunJam.Api.Endpoints.Contribution;

/// <summary>Proposing a revision of a published pose (story 6, ADR 0024 to 0027).</summary>
internal static class PoseRevisionEndpoints
{
    public static RouteGroupBuilder MapPoseRevisionEndpoints(this RouteGroupBuilder contribution)
    {
        contribution.MapPost("/pose-revision-proposals", ProposePoseRevision)
            .WithName("ProposePoseRevision")
            .RequireAuthorization(Capabilities.CanPropose)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        contribution.MapGet("/pose-revision-proposals/pending", GetPendingRevisionOfPose)
            .WithName("GetPendingRevisionOfPose")
            .RequireAuthorization(Capabilities.CanPropose)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        contribution.MapPost("/pose-revision-proposals/{id:guid}/acceptance", AcceptPoseRevision)
            .WithName("AcceptPoseRevision")
            .RequireAuthorization(Capabilities.CanValidate)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        contribution.MapPost("/pose-revision-proposals/{id:guid}/rejection", RejectPoseRevision)
            .WithName("RejectPoseRevision")
            .RequireAuthorization(Capabilities.CanValidate)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return contribution;
    }

    /// <summary>
    /// Whether the pose already has a pending revision, « la tienne » or not (story 6, decision D): the site tells it as soon as
    /// the form opens. An unknown pose has none (the form tells it is not in the catalog, from GET /catalog/poses/{id}).
    /// </summary>
    private static async Task<Results<Ok<PendingRevisionOfPoseResponse>, ProblemHttpResult>> GetPendingRevisionOfPose(
        Guid poseId,
        ClaimsPrincipal requester,
        IQueryHandler<GetPendingRevisionOfPose, PendingRevisionOfPose?> handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(
            new GetPendingRevisionOfPose(ContributionEndpoints.ContributorOf(requester), new PublishedPoseId(poseId)), ct);
        if (result.IsFailure) return result.Error!.ToProblem();
        var pending = result.Value;
        return TypedResults.Ok(new PendingRevisionOfPoseResponse(pending is null ? null : new PendingRevisionResponse(pending.IsYours)));
    }

    /// <summary>
    /// Same body as the acceptance of a pose proposal (ADR 0022): an absent body, or an absent or null field, keeps the revised
    /// value. Whether the retained revision still changes the pose is decided by the PoseRevisionProposal aggregate (ADR 0026).
    /// </summary>
    private static async Task<Results<Ok<AcceptedPoseProposalResponse>, ProblemHttpResult>> AcceptPoseRevision(
        Guid id,
        AcceptPoseProposalRequest? request,
        ClaimsPrincipal validator,
        ICommandHandler<AcceptPoseRevision, DecidedPoseRevisionDto> handler,
        CancellationToken ct)
    {
        var adjustments = PoseAdjustments.Create(
            request?.Name, request?.BaseDifficulty, request?.FlyerDifficulty, request?.CanStartFlow, request?.CanEndFlow);
        if (adjustments.IsFailure) return adjustments.Error!.ToProblem();
        var note = AdjustmentNote.Create(request?.Message);
        if (note.IsFailure) return note.Error!.ToProblem();

        var result = await handler.Handle(
            new AcceptPoseRevision(new PoseRevisionProposalId(id), ContributionEndpoints.ValidatorOf(validator), adjustments.Value!, note.Value), ct);
        if (result.IsFailure) return result.Error!.ToProblem();

        var accepted = result.Value!;
        var retained = accepted.Retained!;
        return TypedResults.Ok(new AcceptedPoseProposalResponse(
            accepted.Id.Value,
            ProposalStatusCodes.From(accepted.Status),
            accepted.HasAdjustments,
            retained.Name.Value,
            DifficultyCodes.From(retained.Difficulty.Base),
            DifficultyCodes.From(retained.Difficulty.Flyer),
            retained.Flow.CanStartFlow,
            retained.Flow.CanEndFlow));
    }

    private static async Task<Results<Ok<RejectedPoseProposalResponse>, ProblemHttpResult>> RejectPoseRevision(
        Guid id,
        RejectPoseProposalRequest request,
        ClaimsPrincipal validator,
        ICommandHandler<RejectPoseRevision, DecidedPoseRevisionDto> handler,
        CancellationToken ct)
    {
        var reason = RejectionReason.Create(request.Reason);
        if (reason.IsFailure) return reason.Error!.ToProblem();

        var result = await handler.Handle(
            new RejectPoseRevision(new PoseRevisionProposalId(id), ContributionEndpoints.ValidatorOf(validator), reason.Value!), ct);
        if (result.IsFailure) return result.Error!.ToProblem();
        return TypedResults.Ok(new RejectedPoseProposalResponse(result.Value!.Id.Value, ProposalStatusCodes.From(result.Value.Status)));
    }

    internal static MyPoseRevisionResponse ToResponse(MyPoseRevision revision) =>
        new(
            revision.Id.Value,
            MyProposalStatusCodes.From(revision.Status),
            revision.PoseName.Value,
            revision.SubmittedAt,
            revision.DecidedAt,
            new PoseChangesResponse(
                revision.Changes.OfType<NameChange>().Select(c => new NameValueChangeResponse(c.Before.Value, c.After.Value)).SingleOrDefault(),
                revision.Changes.OfType<BaseDifficultyChange>()
                    .Select(c => new DifficultyValueChangeResponse(DifficultyCodes.From(c.Before), DifficultyCodes.From(c.After))).SingleOrDefault(),
                revision.Changes.OfType<FlyerDifficultyChange>()
                    .Select(c => new DifficultyValueChangeResponse(DifficultyCodes.From(c.Before), DifficultyCodes.From(c.After))).SingleOrDefault(),
                revision.Changes.OfType<CanStartFlowChange>().Select(c => new FlowValueChangeResponse(c.Before, c.After)).SingleOrDefault(),
                revision.Changes.OfType<CanEndFlowChange>().Select(c => new FlowValueChangeResponse(c.Before, c.After)).SingleOrDefault()),
            ContributionEndpoints.ToResponse(revision.Adjustments),
            revision.Note?.Value,
            revision.Reason?.Value);

    internal static PendingPoseRevisionResponse ToResponse(PendingPoseRevisionDto revision)
    {
        var current = revision.Current;
        return new PendingPoseRevisionResponse(
            revision.Id.Value,
            new RevisedPoseResponse(
                revision.Pose.Value,
                current.Name.Value,
                DifficultyCodes.From(current.Difficulty.Base),
                DifficultyCodes.From(current.Difficulty.Flyer),
                current.Flow.CanStartFlow,
                current.Flow.CanEndFlow),
            new RevisionChangesResponse(
                revision.Changes.OfType<NameChange>().Select(c => new NameChangeResponse(c.Before.Value, c.After.Value)).SingleOrDefault(),
                revision.Changes.OfType<BaseDifficultyChange>()
                    .Select(c => new DifficultyChangeResponse(DifficultyCodes.From(c.Before), DifficultyCodes.From(c.After))).SingleOrDefault(),
                revision.Changes.OfType<FlyerDifficultyChange>()
                    .Select(c => new DifficultyChangeResponse(DifficultyCodes.From(c.Before), DifficultyCodes.From(c.After))).SingleOrDefault(),
                revision.Changes.OfType<CanStartFlowChange>().Select(c => new FlowChangeResponse(c.Before, c.After)).SingleOrDefault(),
                revision.Changes.OfType<CanEndFlowChange>().Select(c => new FlowChangeResponse(c.Before, c.After)).SingleOrDefault()),
            revision.Message?.Value,
            new ProposalContributorResponse(revision.ContributorEmail, revision.IsYou),
            revision.SubmittedAt);
    }

    /// <summary>
    /// The endpoint only builds the changes (an absent or null field keeps the value of the pose): whether the revision
    /// changes anything is decided by the PoseRevisionProposal aggregate (ADR 0026).
    /// </summary>
    private static async Task<Results<Created<PoseRevisionProposalResponse>, ProblemHttpResult>> ProposePoseRevision(
        ProposePoseRevisionRequest request,
        ClaimsPrincipal contributor,
        ICommandHandler<ProposePoseRevision, PoseRevisionProposalDto> handler,
        CancellationToken ct)
    {
        var changes = PoseChanges.Create(request.Name, request.BaseDifficulty, request.FlyerDifficulty, request.CanStartFlow, request.CanEndFlow);
        if (changes.IsFailure) return changes.Error!.ToProblem();
        var version = PublishedPoseVersion.Create(request.PoseVersion);
        if (version.IsFailure) return version.Error!.ToProblem();
        var message = RevisionMessage.Create(request.Message);
        if (message.IsFailure) return message.Error!.ToProblem();

        var command = new ProposePoseRevision(
            ContributionEndpoints.ContributorOf(contributor),
            new PublishedPoseId(request.PoseId),
            version.Value,
            changes.Value!,
            message.Value);
        var result = await handler.Handle(command, ct);
        if (result.IsFailure) return result.Error!.ToProblem();

        var revision = result.Value!;
        return TypedResults.Created((string?)null, new PoseRevisionProposalResponse(
            revision.Id.Value,
            ProposalStatusCodes.From(revision.Status),
            request.PoseId,
            revision.Pose.Name.Value,
            DifficultyCodes.From(revision.Pose.Difficulty.Base),
            DifficultyCodes.From(revision.Pose.Difficulty.Flyer),
            revision.Pose.Flow.CanStartFlow,
            revision.Pose.Flow.CanEndFlow));
    }
}

/// <summary>
/// A revision of a published pose, from the version read (ADR 0024): only the changed fields; an absent or null field keeps
/// the value of the pose. Deliberately permissive, as a pose proposal (ADR 0018).
/// </summary>
public sealed record ProposePoseRevisionRequest(
    Guid PoseId,
    int? PoseVersion,
    string? Name,
    string? BaseDifficulty,
    string? FlyerDifficulty,
    bool? CanStartFlow,
    bool? CanEndFlow,
    string? Message);

/// <summary>The pending revision of a pose, or null when it has none (story 6, decision D).</summary>
public sealed record PendingRevisionOfPoseResponse(PendingRevisionResponse? PendingRevision);

/// <summary>A pending revision: only whether the requester proposed it, never who did.</summary>
public sealed record PendingRevisionResponse(bool IsYours);

/// <summary>The received revision proposal, with the pose as revised (normalised name).</summary>
public sealed record PoseRevisionProposalResponse(
    Guid Id,
    ProposalStatusCode Status,
    Guid PoseId,
    string Name,
    DifficultyCode BaseDifficulty,
    DifficultyCode FlyerDifficulty,
    bool CanStartFlow,
    bool CanEndFlow);

/// <summary>
/// A revision proposal pending validation (story 6, ADR 0027): the pose with its current values, the changed fields (current →
/// proposed, null for an unchanged field), the message of the contributor, the contributor and when it was submitted.
/// </summary>
public sealed record PendingPoseRevisionResponse(
    Guid Id,
    RevisedPoseResponse Pose,
    RevisionChangesResponse Changes,
    string? Message,
    ProposalContributorResponse Contributor,
    DateTimeOffset SubmittedAt) : PendingProposalResponse;

/// <summary>The revised pose with its current values.</summary>
public sealed record RevisedPoseResponse(
    Guid Id, string Name, DifficultyCode BaseDifficulty, DifficultyCode FlyerDifficulty, bool CanStartFlow, bool CanEndFlow);

/// <summary>The fields a revision changes; an unchanged field is null.</summary>
public sealed record RevisionChangesResponse(
    NameChangeResponse? Name,
    DifficultyChangeResponse? BaseDifficulty,
    DifficultyChangeResponse? FlyerDifficulty,
    FlowChangeResponse? CanStartFlow,
    FlowChangeResponse? CanEndFlow);

public sealed record NameChangeResponse(string Current, string Proposed);

public sealed record DifficultyChangeResponse(DifficultyCode Current, DifficultyCode Proposed);

public sealed record FlowChangeResponse(bool Current, bool Proposed);

/// <summary>
/// One of their revision proposals, as its contributor sees it (story 6, ADR 0027): the pose by its name when proposed, its
/// status and dates, what changes in the pose (before → after: retained once accepted, proposed otherwise), the adjustments,
/// the adjustment note or the rejection reason. Nothing designates the validator who decided (Q12).
/// </summary>
public sealed record MyPoseRevisionResponse(
    Guid Id,
    MyProposalStatusCode Status,
    string PoseName,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? DecidedAt,
    PoseChangesResponse Changes,
    PoseAdjustmentsResponse? Adjustments,
    string? Message,
    string? Reason) : MyProposalResponse;

/// <summary>The fields a revision changes in the pose, each with its value before and after; null when unchanged.</summary>
public sealed record PoseChangesResponse(
    NameValueChangeResponse? Name,
    DifficultyValueChangeResponse? BaseDifficulty,
    DifficultyValueChangeResponse? FlyerDifficulty,
    FlowValueChangeResponse? CanStartFlow,
    FlowValueChangeResponse? CanEndFlow);

public sealed record NameValueChangeResponse(string Before, string After);

public sealed record DifficultyValueChangeResponse(DifficultyCode Before, DifficultyCode After);

public sealed record FlowValueChangeResponse(bool Before, bool After);
