using System.Security.Claims;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Identity.GetMyAccount;
using AcroFunJam.Domain.Identity;
using Microsoft.AspNetCore.Authorization;

namespace AcroFunJam.Api.Authorization;

/// <summary>Authorization policies named after capabilities, never after roles (ADR 0008).</summary>
public static class Capabilities
{
    public const string CanPropose = nameof(CanPropose);
    public const string CanValidate = nameof(CanValidate);
    public const string CanManageRoles = nameof(CanManageRoles);

    public static IServiceCollection AddCapabilityPolicies(this IServiceCollection services)
    {
        services.AddScoped<IAuthorizationHandler, CapabilityAuthorizationHandler>();
        services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationMiddlewareResultHandler, ProblemDetailsAuthorizationResultHandler>();
        services.AddAuthorizationBuilder()
            .AddPolicy(CanPropose, policy => policy.RequireAuthenticatedUser().AddRequirements(new CapabilityRequirement(Capability.Propose)))
            .AddPolicy(CanValidate, policy => policy.RequireAuthenticatedUser().AddRequirements(new CapabilityRequirement(Capability.ValidateProposals)))
            .AddPolicy(CanManageRoles, policy => policy.RequireAuthenticatedUser().AddRequirements(new CapabilityRequirement(Capability.ManageRoles)));
        return services;
    }
}

public sealed record CapabilityRequirement(Capability Capability) : IAuthorizationRequirement;

/// <summary>Reads the CURRENT role of the account at each check, so that a revoked role takes effect at once.</summary>
internal sealed class CapabilityAuthorizationHandler(IQueryHandler<GetMyAccount, MyAccountDto> myAccount)
    : AuthorizationHandler<CapabilityRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, CapabilityRequirement requirement)
    {
        if (!Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return;

        var ct = context.Resource is HttpContext http ? http.RequestAborted : CancellationToken.None;
        var account = await myAccount.Handle(new GetMyAccount(new AccountId(id)), ct);
        if (account.IsSuccess && account.Value!.Role.Grants(requirement.Capability))
        {
            context.Succeed(requirement);
        }
    }
}
