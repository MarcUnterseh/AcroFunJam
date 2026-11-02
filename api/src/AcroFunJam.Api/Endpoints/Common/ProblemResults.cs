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
    };

    /// <summary>404, 409 or 400 for the listed codes; otherwise 422 (a business rule refused the request).</summary>
    public static ProblemHttpResult ToProblem(this Error error)
    {
        ArgumentNullException.ThrowIfNull(error);
        var status = StatusByCode.GetValueOrDefault(error.Code, StatusCodes.Status422UnprocessableEntity);
        return TypedResults.Problem(detail: error.Message, title: error.Code, statusCode: status);
    }
}
