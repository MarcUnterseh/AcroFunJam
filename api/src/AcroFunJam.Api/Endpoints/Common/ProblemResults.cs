using AcroFunJam.Domain.Common;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AcroFunJam.Api.Endpoints.Common;

/// <summary>Converts an expected business error into ProblemDetails, its stable code in <c>title</c> (ADR 0007).</summary>
public static class ProblemResults
{
    private static readonly Dictionary<string, int> StatusByCode = new(StringComparer.Ordinal)
    {
        ["identity.account-not-found"] = StatusCodes.Status404NotFound,
        ["identity.last-administrator"] = StatusCodes.Status409Conflict,
        ["identity.concurrent-role-change"] = StatusCodes.Status409Conflict,
        ["identity.unknown-role"] = StatusCodes.Status400BadRequest,
        ["identity.invalid-email"] = StatusCodes.Status400BadRequest,
        // Content of a pose (shared kernel, ADR 0018).
        ["pose.name-required"] = StatusCodes.Status400BadRequest,
        ["pose.name-too-long"] = StatusCodes.Status400BadRequest,
        ["pose.base-difficulty-required"] = StatusCodes.Status400BadRequest,
        ["pose.flyer-difficulty-required"] = StatusCodes.Status400BadRequest,
        ["pose.unknown-difficulty-level"] = StatusCodes.Status400BadRequest,
        ["pose.can-start-flow-required"] = StatusCodes.Status400BadRequest,
        ["pose.can-end-flow-required"] = StatusCodes.Status400BadRequest,
        // Name already taken (ADR 0017, ADR 0018).
        ["contribution.pose-name-already-in-catalog"] = StatusCodes.Status409Conflict,
        ["contribution.pose-name-already-pending"] = StatusCodes.Status409Conflict,
        ["catalog.pose-name-taken"] = StatusCodes.Status409Conflict,
        // Deciding on a proposal (ADR 0022).
        ["contribution.proposal-not-found"] = StatusCodes.Status404NotFound,
        ["contribution.proposal-already-decided"] = StatusCodes.Status409Conflict,
        ["contribution.rejection-reason-required"] = StatusCodes.Status400BadRequest,
        ["contribution.rejection-reason-too-long"] = StatusCodes.Status400BadRequest,
        ["contribution.adjustment-note-too-long"] = StatusCodes.Status400BadRequest,
        // A note without adjustment (contribution.adjustment-note-without-adjustment) is a refused business rule: 422.
        // A role revoked between the authorization policy and the use case.
        ["contribution.validator-required"] = StatusCodes.Status403Forbidden,
        // The account was deleted after signing in: the site handles it as an expired session (ADR 0018).
        ["contribution.unknown-contributor"] = StatusCodes.Status401Unauthorized,
        ["contribution.unknown-validator"] = StatusCodes.Status401Unauthorized,
        ["identity.account-deleted"] = StatusCodes.Status401Unauthorized,
    };

    /// <summary>The status of the listed codes; otherwise 422 (a business rule refused the request).</summary>
    public static ProblemHttpResult ToProblem(this Error error)
    {
        ArgumentNullException.ThrowIfNull(error);
        var status = StatusByCode.GetValueOrDefault(error.Code, StatusCodes.Status422UnprocessableEntity);
        return TypedResults.Problem(detail: error.Message, title: error.Code, statusCode: status);
    }
}
