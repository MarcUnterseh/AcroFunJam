using System.Security.Claims;
using System.Text.Json.Serialization;
using AcroFunJam.Api.Authorization;
using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Application.Contribution.AcceptPoseProposal;
using AcroFunJam.Application.Contribution.CountPendingPoseProposals;
using AcroFunJam.Application.Contribution.GetPendingPoseProposals;
using AcroFunJam.Application.Contribution.ProposePose;
using AcroFunJam.Application.Contribution.RejectPoseProposal;
using AcroFunJam.Domain.Contribution;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AcroFunJam.Api.Endpoints.Contribution;

public static class ContributionEndpoints
{

    public static IEndpointRouteBuilder MapContributionEndpoints(this IEndpointRouteBuilder app)
    {
        var contribution = app.MapGroup("/contribution").WithTags("Contribution");

        contribution.MapPost("/pose-proposals", ProposePose)
            .WithName("ProposePose")
            .RequireAuthorization(Capabilities.CanPropose)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status409Conflict);

        contribution.MapGet("/validation-queue", GetValidationQueue)
            .WithName("GetValidationQueue")
            .RequireAuthorization(Capabilities.CanValidate)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        contribution.MapGet("/validation-queue/count", CountPendingProposals)
            .WithName("CountPendingPoseProposals")
            .RequireAuthorization(Capabilities.CanValidate)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        contribution.MapPost("/pose-proposals/{id:guid}/acceptance", AcceptPoseProposal)
            .WithName("AcceptPoseProposal")
            .RequireAuthorization(Capabilities.CanValidate)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        contribution.MapPost("/pose-proposals/{id:guid}/rejection", RejectPoseProposal)
            .WithName("RejectPoseProposal")
            .RequireAuthorization(Capabilities.CanValidate)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return app;
    }

    /// <summary>
    /// The endpoint only builds the proposed pose and passes on the contributor: whether the pose is published
    /// directly is decided by the PoseProposal aggregate, from the contributor's current role (ADR 0014).
    /// </summary>
    private static async Task<Results<Created<PoseProposalResponse>, ProblemHttpResult>> ProposePose(
        ProposePoseRequest request,
        ClaimsPrincipal contributor,
        ICommandHandler<ProposePose, PoseProposalDto> handler,
        CancellationToken ct)
    {
        var pose = ProposedPose.Create(request.Name, request.BaseDifficulty, request.FlyerDifficulty, request.CanStartFlow, request.CanEndFlow);
        if (pose.IsFailure) return pose.Error!.ToProblem();

        var result = await handler.Handle(new ProposePose(ContributorOf(contributor), pose.Value!), ct);
        if (result.IsFailure) return result.Error!.ToProblem();

        // No Location header: a proposal cannot be read back yet (ADR 0018).
        return TypedResults.Created((string?)null, ToResponse(result.Value!));
    }

    private static async Task<Results<Ok<ValidationQueueResponse>, ProblemHttpResult>> GetValidationQueue(
        ClaimsPrincipal validator,
        IQueryHandler<GetPendingPoseProposals, IReadOnlyList<PendingPoseProposalDto>> handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(new GetPendingPoseProposals(ValidatorOf(validator)), ct);
        if (result.IsFailure) return result.Error!.ToProblem();
        return TypedResults.Ok(new ValidationQueueResponse([.. result.Value!.Select(ToResponse)]));
    }

    private static async Task<Results<Ok<PendingCountResponse>, ProblemHttpResult>> CountPendingProposals(
        IQueryHandler<CountPendingPoseProposals, int> handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(new CountPendingPoseProposals(), ct);
        if (result.IsFailure) return result.Error!.ToProblem();
        return TypedResults.Ok(new PendingCountResponse(result.Value));
    }

    /// <summary>
    /// The endpoint only builds the adjustments and the note (an absent body, or an absent or null field, keeps the proposed
    /// value): whether the retained pose differs from the proposed pose is decided by the PoseProposal aggregate (ADR 0022).
    /// </summary>
    private static async Task<Results<Ok<AcceptedPoseProposalResponse>, ProblemHttpResult>> AcceptPoseProposal(
        Guid id,
        AcceptPoseProposalRequest? request,
        ClaimsPrincipal validator,
        ICommandHandler<AcceptPoseProposal, DecidedPoseProposalDto> handler,
        CancellationToken ct)
    {
        var adjustments = PoseAdjustments.Create(
            request?.Name, request?.BaseDifficulty, request?.FlyerDifficulty, request?.CanStartFlow, request?.CanEndFlow);
        if (adjustments.IsFailure) return adjustments.Error!.ToProblem();
        var note = AdjustmentNote.Create(request?.Message);
        if (note.IsFailure) return note.Error!.ToProblem();

        var result = await handler.Handle(
            new AcceptPoseProposal(new PoseProposalId(id), ValidatorOf(validator), adjustments.Value!, note.Value), ct);
        if (result.IsFailure) return result.Error!.ToProblem();

        var accepted = result.Value!;
        var retained = accepted.Retained!;
        return TypedResults.Ok(new AcceptedPoseProposalResponse(
            accepted.Id.Value,
            ProposalStatusCodes.From(accepted.Status),
            accepted.Adjusted,
            retained.Name.Value,
            DifficultyCodes.From(retained.Difficulty.Base),
            DifficultyCodes.From(retained.Difficulty.Flyer),
            retained.Flow.CanStartFlow,
            retained.Flow.CanEndFlow));
    }

    private static async Task<Results<Ok<RejectedPoseProposalResponse>, ProblemHttpResult>> RejectPoseProposal(
        Guid id,
        RejectPoseProposalRequest request,
        ClaimsPrincipal validator,
        ICommandHandler<RejectPoseProposal, DecidedPoseProposalDto> handler,
        CancellationToken ct)
    {
        var reason = RejectionReason.Create(request.Reason);
        if (reason.IsFailure) return reason.Error!.ToProblem();

        var result = await handler.Handle(new RejectPoseProposal(new PoseProposalId(id), ValidatorOf(validator), reason.Value!), ct);
        if (result.IsFailure) return result.Error!.ToProblem();
        return TypedResults.Ok(new RejectedPoseProposalResponse(result.Value!.Id.Value, ProposalStatusCodes.From(result.Value.Status)));
    }

    private static ValidatorId ValidatorOf(ClaimsPrincipal principal) => new(AccountIdOf(principal));

    private static PendingPoseProposalResponse ToResponse(PendingPoseProposalDto proposal) =>
        new(
            proposal.Id.Value,
            proposal.ProposedPose.Name.Value,
            DifficultyCodes.From(proposal.ProposedPose.Difficulty.Base),
            DifficultyCodes.From(proposal.ProposedPose.Difficulty.Flyer),
            proposal.ProposedPose.Flow.CanStartFlow,
            proposal.ProposedPose.Flow.CanEndFlow,
            new ProposalContributorResponse(proposal.ContributorEmail, proposal.IsYou),
            proposal.SubmittedAt);

    private static ContributorId ContributorOf(ClaimsPrincipal principal) => new(AccountIdOf(principal));

    /// <summary>Contributor and validator identifiers carry the value of the account identifier (ADR 0022).</summary>
    private static Guid AccountIdOf(ClaimsPrincipal principal) =>
        Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static PoseProposalResponse ToResponse(PoseProposalDto proposal) =>
        new(
            proposal.Id.Value,
            ProposalStatusCodes.From(proposal.Status),
            proposal.Pose.Name.Value,
            DifficultyCodes.From(proposal.Pose.Difficulty.Base),
            DifficultyCodes.From(proposal.Pose.Difficulty.Flyer),
            proposal.Pose.Flow.CanStartFlow,
            proposal.Pose.Flow.CanEndFlow);
}

/// <summary>
/// A pose proposal. Deliberately permissive (strings and nullable booleans): a missing or unknown value is
/// refused with a business code (<c>pose.*</c>) rather than by the JSON deserialiser (ADR 0018).
/// </summary>
public sealed record ProposePoseRequest(string? Name, string? BaseDifficulty, string? FlyerDifficulty, bool? CanStartFlow, bool? CanEndFlow);

/// <summary>The received proposal; its name is the normalised name.</summary>
public sealed record PoseProposalResponse(
    Guid Id,
    ProposalStatusCode Status,
    string Name,
    DifficultyCode BaseDifficulty,
    DifficultyCode FlyerDifficulty,
    bool CanStartFlow,
    bool CanEndFlow);

/// <summary>The validation queue: pending proposals, the oldest first (ADR 0007: lists are wrapped).</summary>
public sealed record ValidationQueueResponse(IReadOnlyList<PendingPoseProposalResponse> Proposals);

/// <summary>A proposal pending validation: the proposed pose, its contributor and when it was submitted.</summary>
public sealed record PendingPoseProposalResponse(
    Guid Id,
    string Name,
    DifficultyCode BaseDifficulty,
    DifficultyCode FlyerDifficulty,
    bool CanStartFlow,
    bool CanEndFlow,
    ProposalContributorResponse Contributor,
    DateTimeOffset SubmittedAt);

/// <summary>
/// The acceptance of a proposal, with the values the validator adjusts (story 4, step B): each field optional, absent or
/// null keeps the proposed value; "" is a name, refused as empty. Deliberately permissive, like
/// <see cref="ProposePoseRequest"/>: a value off the rules is refused with a business code (<c>pose.*</c>, ADR 0018).
/// <see cref="Message"/> is the optional adjustment note, for the contributor. Properties rather than constructor parameters,
/// so that the OpenAPI document marks every field as optional.
/// </summary>
public sealed record AcceptPoseProposalRequest
{
    public string? Name { get; init; }

    public string? BaseDifficulty { get; init; }

    public string? FlyerDifficulty { get; init; }

    public bool? CanStartFlow { get; init; }

    public bool? CanEndFlow { get; init; }

    public string? Message { get; init; }
}

/// <summary>An accepted proposal: the retained pose, published in the catalog, and whether the validator adjusted it.</summary>
public sealed record AcceptedPoseProposalResponse(
    Guid Id,
    ProposalStatusCode Status,
    bool Adjusted,
    string Name,
    DifficultyCode BaseDifficulty,
    DifficultyCode FlyerDifficulty,
    bool CanStartFlow,
    bool CanEndFlow);

/// <summary>
/// The rejection of a proposal. Deliberately permissive: a missing reason is refused with a business code
/// (<c>contribution.rejection-reason-required</c>) rather than by the JSON deserialiser (ADR 0018).
/// </summary>
public sealed record RejectPoseProposalRequest(string? Reason);

/// <summary>A rejected proposal: nothing is published.</summary>
public sealed record RejectedPoseProposalResponse(Guid Id, ProposalStatusCode Status);

/// <summary>How many proposals are pending validation.</summary>
public sealed record PendingCountResponse(int Count);

/// <summary>The contributor of a proposal: their address (null if the account no longer exists), and whether it is the requester.</summary>
public sealed record ProposalContributorResponse(string? Email, bool IsYou);

/// <summary>Status of a proposal: pending validation, accepted (hence published) or rejected (ADR 0022).</summary>
[JsonConverter(typeof(JsonStringEnumConverter<ProposalStatusCode>))]
public enum ProposalStatusCode
{
    [JsonStringEnumMemberName("pending")] Pending,
    [JsonStringEnumMemberName("accepted")] Accepted,
    [JsonStringEnumMemberName("rejected")] Rejected,
}

public static class ProposalStatusCodes
{
    public static ProposalStatusCode From(ProposalStatus status) => status switch
    {
        ProposalStatus.Pending => ProposalStatusCode.Pending,
        ProposalStatus.Accepted => ProposalStatusCode.Accepted,
        ProposalStatus.Rejected => ProposalStatusCode.Rejected,
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Unknown proposal status."),
    };
}
