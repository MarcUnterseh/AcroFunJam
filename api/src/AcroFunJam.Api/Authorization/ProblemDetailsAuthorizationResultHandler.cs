using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Domain.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace AcroFunJam.Api.Authorization;

/// <summary>Turns authorization refusals into ProblemDetails: 401 for a visitor, 403 naming the missing capability.</summary>
internal sealed class ProblemDetailsAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Forbidden && IsAccountDeleted(authorizeResult))
        {
            // Signed in, but the account no longer exists: the site handles it as an expired session (ADR 0018).
            await IdentityErrors.AccountDeleted.ToProblem().ExecuteAsync(context);
            return;
        }

        if (authorizeResult.Forbidden)
        {
            var missing = authorizeResult.AuthorizationFailure?.FailedRequirements.OfType<CapabilityRequirement>().FirstOrDefault();
            await Results.Problem(
                    title: "identity.capability-required",
                    detail: Describe(missing?.Capability),
                    statusCode: StatusCodes.Status403Forbidden)
                .ExecuteAsync(context);
            return;
        }

        await _default.HandleAsync(next, context, policy, authorizeResult);
    }

    private static bool IsAccountDeleted(PolicyAuthorizationResult result) =>
        result.AuthorizationFailure?.FailureReasons.Any(r => r.Message == CapabilityAuthorizationHandler.AccountDeleted) == true;

    private static string Describe(Capability? capability) => capability switch
    {
        Capability.ManageRoles => "Seul un administrateur gère les rôles.",
        Capability.ValidateProposals => "Seul un validateur peut accepter ou refuser une proposition.",
        Capability.Propose => "Il faut être utilisateur pour proposer.",
        _ => "Votre rôle ne permet pas cette action.",
    };
}
