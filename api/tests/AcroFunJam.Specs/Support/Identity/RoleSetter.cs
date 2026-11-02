using AcroFunJam.Application.Common;
using AcroFunJam.Application.Identity.AssignRole;
using AcroFunJam.Domain.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Specs.Support.Identity;

/// <summary>
/// Puts an account in a given role for a "Soit" step, through the AssignRole command resolved from the
/// application services (no HTTP, no policy) — ADR 0009.
/// </summary>
public sealed class RoleSetter(Deployment deployment)
{
    /// <summary>Author of the role changes made to set up a scenario (not an account).</summary>
    private static readonly AccountId ScenarioSetUp = new(Guid.Empty);

    public async Task SetRole(string email, string roleCode)
    {
        var role = Role.FromCode(roleCode).Value!;
        if (role == Role.User) return; // every account is a user

        using var scope = deployment.Current.Services.CreateScope();
        var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<AssignRole, bool>>();
        var result = await handler.Handle(new AssignRole(EmailAddress.Create(email).Value!, role, By: ScenarioSetUp), CancellationToken.None);
        if (result.IsFailure) throw new InvalidOperationException($"Cannot put {email} in role {roleCode}: {result.Error}.");
    }

    public async Task<int> CountAdministrators()
    {
        using var scope = deployment.Current.Services.CreateScope();
        var accounts = scope.ServiceProvider.GetRequiredService<AcroFunJam.Application.Identity.IAccountRepository>();
        return await accounts.CountAdministrators(CancellationToken.None);
    }
}
