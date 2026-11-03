using System.Security.Claims;
using System.Text.Json.Serialization;
using AcroFunJam.Api.Authorization;
using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution.ProposePose;
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

    private static ContributorId ContributorOf(ClaimsPrincipal principal) =>
        new(Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!));

    private static PoseProposalResponse ToResponse(PoseProposalDto proposal) =>
        new(
            proposal.Id.Value,
            proposal.Status == ProposalStatus.Accepted ? ProposalStatusCode.Accepted : ProposalStatusCode.Pending,
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

/// <summary>Status of a received proposal: pending validation, or accepted, hence published directly.</summary>
[JsonConverter(typeof(JsonStringEnumConverter<ProposalStatusCode>))]
public enum ProposalStatusCode
{
    [JsonStringEnumMemberName("pending")] Pending,
    [JsonStringEnumMemberName("accepted")] Accepted,
}
