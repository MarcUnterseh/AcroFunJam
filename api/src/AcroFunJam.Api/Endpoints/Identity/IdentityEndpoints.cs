using System.Security.Claims;
using AcroFunJam.Api.Authorization;
using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Identity.AssignRole;
using AcroFunJam.Application.Identity.GetMyAccount;
using AcroFunJam.Application.Identity.RevokeRole;
using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.Persistence.Identity;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AcroFunJam.Api.Endpoints.Identity;

public static class IdentityEndpoints
{
    public static IEndpointRouteBuilder MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        var identity = app.MapGroup("/identity").WithTags("Identity");

        // Registration, sign-in and tokens come from ASP.NET Core Identity, exposed as is (ADR 0008).
        // Registering never grants a role: the initial administrator is only promoted at start-up.
        identity.MapIdentityApi<ApplicationUser>();

        identity.MapPost("/role-assignments", AssignRole).WithName("AssignRole").RequireAuthorization(Capabilities.CanManageRoles);
        identity.MapPost("/role-revocations", RevokeRole).WithName("RevokeRole").RequireAuthorization(Capabilities.CanManageRoles);

        app.MapGet("/me", GetMyAccount).WithName("GetMyAccount").WithTags("Identity").RequireAuthorization();

        return app;
    }

    private static async Task<Results<Ok<MyAccountResponse>, ProblemHttpResult>> GetMyAccount(
        ClaimsPrincipal principal,
        IQueryHandler<GetMyAccount, MyAccountDto> handler,
        CancellationToken ct)
    {
        var result = await handler.Handle(new GetMyAccount(AccountIdOf(principal)), ct);
        if (result.IsFailure) return result.Error!.ToProblem();

        var account = result.Value!;
        return TypedResults.Ok(new MyAccountResponse(account.Email.Value, account.Role.Code, [.. account.Role.Capabilities.Select(CapabilityCode)]));
    }

    private static async Task<Results<NoContent, ProblemHttpResult>> AssignRole(
        RoleChangeRequest request,
        ClaimsPrincipal administrator,
        ICommandHandler<AssignRole, bool> handler,
        ILoggerFactory loggers,
        CancellationToken ct)
    {
        var email = EmailAddress.Create(request.Email);
        if (email.IsFailure) return email.Error!.ToProblem();
        var role = Role.FromCode(request.Role);
        if (role.IsFailure) return role.Error!.ToProblem();

        var by = AccountIdOf(administrator);
        var result = await handler.Handle(new AssignRole(email.Value!, role.Value!, by), ct);
        var log = loggers.CreateLogger(typeof(IdentityEndpoints));
        if (result.IsFailure)
        {
            IdentityLog.RoleChangeRefused(log, email.Value!.Value, result.Error!.Code);
            return result.Error.ToProblem();
        }

        if (result.Value) IdentityLog.RoleAssigned(log, role.Value!.Code, email.Value!.Value, by.Value);
        return TypedResults.NoContent();
    }

    private static async Task<Results<NoContent, ProblemHttpResult>> RevokeRole(
        RoleChangeRequest request,
        ClaimsPrincipal administrator,
        ICommandHandler<RevokeRole, bool> handler,
        ILoggerFactory loggers,
        CancellationToken ct)
    {
        var email = EmailAddress.Create(request.Email);
        if (email.IsFailure) return email.Error!.ToProblem();
        var role = Role.FromCode(request.Role);
        if (role.IsFailure) return role.Error!.ToProblem();

        var by = AccountIdOf(administrator);
        var result = await handler.Handle(new RevokeRole(email.Value!, role.Value!, by), ct);
        var log = loggers.CreateLogger(typeof(IdentityEndpoints));
        if (result.IsFailure)
        {
            IdentityLog.RoleChangeRefused(log, email.Value!.Value, result.Error!.Code);
            return result.Error.ToProblem();
        }

        IdentityLog.RoleRevoked(log, role.Value!.Code, email.Value!.Value, by.Value);
        return TypedResults.NoContent();
    }

    private static AccountId AccountIdOf(ClaimsPrincipal principal) =>
        new(Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!));

    /// <summary>Stable capability codes of the HTTP contract (ADR 0007).</summary>
    private static string CapabilityCode(Capability capability) => capability switch
    {
        Capability.Propose => "propose",
        Capability.ValidateProposals => "validate-proposals",
        Capability.ManageRoles => "manage-roles",
        _ => throw new ArgumentOutOfRangeException(nameof(capability), capability, "Unknown capability."),
    };
}

/// <summary>The signed-in person's account: e-mail address, role code and capability codes.</summary>
public sealed record MyAccountResponse(string Email, string Role, IReadOnlyList<string> Capabilities);

/// <summary>Role change requested by an administrator; the address is in the body, not in the URL (logs).</summary>
public sealed record RoleChangeRequest(string? Email, string? Role);
