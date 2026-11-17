using AcroFunJam.Application.Contribution;
using System.Security.Claims;
using AcroFunJam.Api.Authorization;
using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution.AcceptTransitionProposal;
using AcroFunJam.Application.Contribution.GetPendingPoseProposals;
using AcroFunJam.Application.Contribution.ProposeTransition;
using AcroFunJam.Application.Contribution.RejectTransitionProposal;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AcroFunJam.Api.Endpoints.Contribution;

/// <summary>Proposing a transition between two published poses, and deciding on it (story 7, ADR 0028 to 0030).</summary>
internal static class TransitionEndpoints
{
    public static RouteGroupBuilder MapTransitionEndpoints(this RouteGroupBuilder contribution)
    {
        contribution.MapPost("/transition-proposals", ProposeTransition)
            .WithName("ProposeTransition")
            .RequireAuthorization(Capabilities.CanPropose)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        contribution.MapPost("/transition-proposals/{id:guid}/acceptance", AcceptTransitionProposal)
            .WithName("AcceptTransitionProposal")
            .RequireAuthorization(Capabilities.CanValidate)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        contribution.MapPost("/transition-proposals/{id:guid}/rejection", RejectTransitionProposal)
            .WithName("RejectTransitionProposal")
            .RequireAuthorization(Capabilities.CanValidate)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return contribution;
    }

    /// <summary>
    /// The endpoint builds the poses and the proposed transition, checked in the order of the form; whether the poses are
    /// published, and whether the transition is published directly, is decided by the TransitionProposal aggregate.
    /// </summary>
    private static async Task<Results<Created<TransitionProposalResponse>, ProblemHttpResult>> ProposeTransition(
        ProposeTransitionRequest request,
        ClaimsPrincipal contributor,
        ICommandHandler<ProposeTransition, TransitionProposalDto> handler,
        ICatalogTags tagNames,
        CancellationToken ct)
    {
        var poses = TransitionPoses.Create(request.FromPoseId, request.ToPoseId);
        if (poses.IsFailure) return poses.Error!.ToProblem();
        var transition = ProposedTransition.Create(request.Name, request.BaseDifficulty, request.FlyerDifficulty, request.Description);
        if (transition.IsFailure) return transition.Error!.ToProblem();

        var result = await handler.Handle(
            new ProposeTransition(ContributionEndpoints.ContributorOf(contributor), poses.Value!, transition.Value!, TagIdsOf(request.TagIds)), ct);
        if (result.IsFailure) return result.Error!.ToProblem();

        // No Location header: a proposal cannot be read back on its own (ADR 0018).
        var names = await TagNames.Of(tagNames, [result.Value!.Transition.Tags], ct);
        return TypedResults.Created((string?)null, ToResponse(result.Value!, names));
    }

    /// <summary>
    /// An absent body, or an absent or null field, keeps the proposed value; a blank name or description removes it (ADR 0030).
    /// Whether the retained transition still has its place is decided by the TransitionProposal aggregate.
    /// </summary>
    private static async Task<Results<Ok<AcceptedTransitionProposalResponse>, ProblemHttpResult>> AcceptTransitionProposal(
        Guid id,
        AcceptTransitionProposalRequest? request,
        ClaimsPrincipal validator,
        ICommandHandler<AcceptTransitionProposal, DecidedTransitionProposalDto> handler,
        ICatalogTags tagNames,
        CancellationToken ct)
    {
        var adjustments = TransitionAdjustments.Create(request?.Name, request?.BaseDifficulty, request?.FlyerDifficulty, request?.Description);
        if (adjustments.IsFailure) return adjustments.Error!.ToProblem();
        var note = AdjustmentNote.Create(request?.Message);
        if (note.IsFailure) return note.Error!.ToProblem();

        var result = await handler.Handle(
            new AcceptTransitionProposal(
                new TransitionProposalId(id), ContributionEndpoints.ValidatorOf(validator), adjustments.Value!, note.Value,
                request?.TagIds is null ? null : TagIdsOf(request.TagIds)),
            ct);
        if (result.IsFailure) return result.Error!.ToProblem();

        var accepted = result.Value!;
        var retained = accepted.Retained!;
        var names = await TagNames.Of(tagNames, [retained.Tags], ct);
        return TypedResults.Ok(new AcceptedTransitionProposalResponse(
            accepted.Id.Value,
            ProposalStatusCodes.From(accepted.Status),
            accepted.HasAdjustments,
            new PoseReferenceResponse(accepted.Poses.From.Value, accepted.FromPoseName.Value),
            new PoseReferenceResponse(accepted.Poses.To.Value, accepted.ToPoseName.Value),
            retained.Name?.Value,
            DifficultyCodes.From(retained.Difficulty.Base),
            DifficultyCodes.From(retained.Difficulty.Flyer),
            retained.Description?.Value,
            names.Of(retained.Tags)));
    }

    /// <summary>The tags chosen, by identifier: absent or null is none (ADR 0034).</summary>
    private static IReadOnlyCollection<TagId> TagIdsOf(IReadOnlyList<Guid>? tagIds) => [.. (tagIds ?? []).Select(t => new TagId(t))];

    private static async Task<Results<Ok<RejectedPoseProposalResponse>, ProblemHttpResult>> RejectTransitionProposal(
        Guid id,
        RejectPoseProposalRequest request,
        ClaimsPrincipal validator,
        ICommandHandler<RejectTransitionProposal, DecidedTransitionProposalDto> handler,
        CancellationToken ct)
    {
        var reason = RejectionReason.Create(request.Reason);
        if (reason.IsFailure) return reason.Error!.ToProblem();

        var result = await handler.Handle(
            new RejectTransitionProposal(new TransitionProposalId(id), ContributionEndpoints.ValidatorOf(validator), reason.Value!), ct);
        if (result.IsFailure) return result.Error!.ToProblem();
        return TypedResults.Ok(new RejectedPoseProposalResponse(result.Value!.Id.Value, ProposalStatusCodes.From(result.Value.Status)));
    }

    private static TransitionProposalResponse ToResponse(TransitionProposalDto proposal, TagNames names) =>
        new(
            proposal.Id.Value,
            ProposalStatusCodes.From(proposal.Status),
            new PoseReferenceResponse(proposal.Poses.From.Value, proposal.FromPoseName.Value),
            new PoseReferenceResponse(proposal.Poses.To.Value, proposal.ToPoseName.Value),
            proposal.Transition.Name?.Value,
            DifficultyCodes.From(proposal.Transition.Difficulty.Base),
            DifficultyCodes.From(proposal.Transition.Difficulty.Flyer),
            proposal.Transition.Description?.Value,
            names.Of(proposal.Transition.Tags));

    internal static MyTransitionProposalResponse ToResponse(MyTransitionProposal transition, TagNames names) =>
        new(
            transition.Id.Value,
            MyProposalStatusCodes.From(transition.Status),
            new PoseReferenceResponse(transition.Poses.From.Value, transition.FromPoseName.Value),
            new PoseReferenceResponse(transition.Poses.To.Value, transition.ToPoseName.Value),
            transition.Name?.Value,
            DifficultyCodes.From(transition.Difficulty.Base),
            DifficultyCodes.From(transition.Difficulty.Flyer),
            transition.Description?.Value,
            names.Of(transition.Tags),
            transition.SubmittedAt,
            transition.DecidedAt,
            ToResponse(transition.Adjustments, names),
            transition.Note?.Value,
            transition.Reason?.Value);

    /// <summary>Each adjusted field in its member, with both values (a removed name or description is null); null when nothing was adjusted.</summary>
    private static TransitionAdjustmentsResponse? ToResponse(IReadOnlyList<TransitionFieldAdjustment> adjustments, TagNames names) =>
        adjustments.Count == 0
            ? null
            : adjustments.Aggregate(new TransitionAdjustmentsResponse(null, null, null, null, null), (r, a) => Adjusted(r, a, names));

    private static TransitionAdjustmentsResponse Adjusted(TransitionAdjustmentsResponse response, TransitionFieldAdjustment adjustment, TagNames names) =>
        adjustment switch
        {
            TransitionTagsAdjustment tags => response with { Tags = new(names.Of(tags.Proposed), names.Of(tags.Retained)) },
            TransitionNameAdjustment name => response with { Name = new(name.Proposed?.Value, name.Retained?.Value) },
            TransitionBaseDifficultyAdjustment difficulty => response with
            {
                BaseDifficulty = new(DifficultyCodes.From(difficulty.Proposed), DifficultyCodes.From(difficulty.Retained)),
            },
            TransitionFlyerDifficultyAdjustment difficulty => response with
            {
                FlyerDifficulty = new(DifficultyCodes.From(difficulty.Proposed), DifficultyCodes.From(difficulty.Retained)),
            },
            TransitionDescriptionAdjustment description => response with { Description = new(description.Proposed?.Value, description.Retained?.Value) },
            _ => throw new System.Diagnostics.UnreachableException($"Unknown adjustment: {adjustment.GetType().Name}."),
        };

    internal static PendingTransitionProposalResponse ToResponse(PendingTransitionProposalDto transition, TagNames names) =>
        new(
            transition.Id.Value,
            new PoseReferenceResponse(transition.Poses.From.Value, transition.FromPoseName.Value),
            new PoseReferenceResponse(transition.Poses.To.Value, transition.ToPoseName.Value),
            transition.Transition.Name?.Value,
            DifficultyCodes.From(transition.Transition.Difficulty.Base),
            DifficultyCodes.From(transition.Transition.Difficulty.Flyer),
            transition.Transition.Description?.Value,
            names.Of(transition.Transition.Tags),
            new ProposalContributorResponse(transition.ContributorEmail, transition.IsYou),
            transition.SubmittedAt);
}

/// <summary>
/// A transition proposal. Deliberately permissive (nullable values): a missing or unknown value is refused with a business
/// code rather than by the JSON deserialiser (ADR 0018). A missing, empty or blank name or description is none.
/// </summary>
/// <remarks>The tags chosen, by identifier (story 8): absent, null or empty is none.</remarks>
public sealed record ProposeTransitionRequest(
    Guid? FromPoseId, Guid? ToPoseId, string? Name, string? BaseDifficulty, string? FlyerDifficulty, string? Description,
    IReadOnlyList<Guid>? TagIds = null);

/// <summary>A pose designated by a transition, under its current name in the catalog.</summary>
public sealed record PoseReferenceResponse(Guid Id, string Name);

/// <summary>The received transition proposal: normalised values, current names of its poses (ADR 0030).</summary>
public sealed record TransitionProposalResponse(
    Guid Id,
    ProposalStatusCode Status,
    PoseReferenceResponse FromPose,
    PoseReferenceResponse ToPose,
    string? Name,
    DifficultyCode BaseDifficulty,
    DifficultyCode FlyerDifficulty,
    string? Description,
    IReadOnlyList<ProposalTagResponse> Tags);

/// <summary>
/// The acceptance of a transition proposal, with the values the validator adjusts (ADR 0030): each field optional; absent or
/// null keeps the proposed value; a blank name or description removes it. <see cref="Message"/> is the optional adjustment note.
/// Properties rather than constructor parameters, so that the OpenAPI document marks every field as optional.
/// </summary>
public sealed record AcceptTransitionProposalRequest
{
    public string? Name { get; init; }

    public string? BaseDifficulty { get; init; }

    public string? FlyerDifficulty { get; init; }

    public string? Description { get; init; }

    public string? Message { get; init; }

    /// <summary>The retained tags, by identifier (story 8): absent or null keeps the proposed ones; empty removes them.</summary>
    public IReadOnlyList<Guid>? TagIds { get; init; }

}

/// <summary>An accepted transition proposal: the retained transition, published in the catalog, and whether it was adjusted.</summary>
public sealed record AcceptedTransitionProposalResponse(
    Guid Id,
    ProposalStatusCode Status,
    bool Adjusted,
    PoseReferenceResponse FromPose,
    PoseReferenceResponse ToPose,
    string? Name,
    DifficultyCode BaseDifficulty,
    DifficultyCode FlyerDifficulty,
    string? Description,
    IReadOnlyList<ProposalTagResponse> Tags);

/// <summary>A transition proposal pending validation: its poses under their current names, the transition, its contributor.</summary>
public sealed record PendingTransitionProposalResponse(
    Guid Id,
    PoseReferenceResponse FromPose,
    PoseReferenceResponse ToPose,
    string? Name,
    DifficultyCode BaseDifficulty,
    DifficultyCode FlyerDifficulty,
    string? Description,
    IReadOnlyList<ProposalTagResponse> Tags,
    ProposalContributorResponse Contributor,
    DateTimeOffset SubmittedAt) : PendingProposalResponse;

/// <summary>
/// One of their transition proposals (« Mes propositions », story 7, ADR 0030): the retained transition once accepted, the proposed
/// one otherwise; its poses under their current names; never the validator.
/// </summary>
public sealed record MyTransitionProposalResponse(
    Guid Id,
    MyProposalStatusCode Status,
    PoseReferenceResponse FromPose,
    PoseReferenceResponse ToPose,
    string? Name,
    DifficultyCode BaseDifficulty,
    DifficultyCode FlyerDifficulty,
    string? Description,
    IReadOnlyList<ProposalTagResponse> Tags,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? DecidedAt,
    TransitionAdjustmentsResponse? Adjustments,
    string? Message,
    string? Reason) : MyProposalResponse;

/// <summary>The fields of a transition a validator adjusted, each with its proposed and retained values; null when not adjusted.</summary>
public sealed record TransitionAdjustmentsResponse(
    OptionalTextAdjustmentResponse? Name,
    DifficultyAdjustmentResponse? BaseDifficulty,
    DifficultyAdjustmentResponse? FlyerDifficulty,
    OptionalTextAdjustmentResponse? Description,
    TagsAdjustmentResponse? Tags);

/// <summary>The tags adjusted (story 8): the proposed and the retained ones, in catalog order; none is an empty list.</summary>
public sealed record TagsAdjustmentResponse(IReadOnlyList<ProposalTagResponse> Proposed, IReadOnlyList<ProposalTagResponse> Retained);

/// <summary>An optional text adjusted: null when there was none, or none is retained.</summary>
public sealed record OptionalTextAdjustmentResponse(string? Proposed, string? Retained);
