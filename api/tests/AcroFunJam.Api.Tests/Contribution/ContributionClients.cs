using System.Net.Http.Json;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Identity.AssignRole;
using AcroFunJam.Application.Identity.RevokeRole;
using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>Signed-in browsers and proposals made through the HTTP contract, shared by the Contribution endpoint tests.</summary>
internal static class ContributionClients
{
    private const string Password = "une phrase de passe";
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>A new account of this role, signed in with a session cookie.</summary>
    public static async Task<(HttpClient Browser, string Email)> SignedIn(this ApiWithDatabase api, Role role)
    {
        var email = $"someone-{Guid.NewGuid():N}@example.org";
        var browser = api.CreateBrowserClient();
        (await browser.PostAsJsonAsync(new Uri("/identity/register", UriKind.Relative), new { email, password = Password }, Ct)).EnsureSuccessStatusCode();
        if (role != Role.User) await api.Assign(email, role);
        (await browser.PostAsJsonAsync(new Uri("/identity/login?useCookies=true", UriKind.Relative), new { email, password = Password }, Ct)).EnsureSuccessStatusCode();
        return (browser, email);
    }

    /// <summary>A new account of this role, without a session (for the use cases called in-process); returns its identifier.</summary>
    public static async Task<Guid> AnAccount(this ApiWithDatabase api, Role role)
    {
        var email = $"someone-{Guid.NewGuid():N}@example.org";
        using var client = api.CreateClient();
        (await client.PostAsJsonAsync(new Uri("/identity/register", UriKind.Relative), new { email, password = Password }, Ct)).EnsureSuccessStatusCode();
        if (role != Role.User) await api.Assign(email, role);
        using var scope = api.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AcroFunJamDbContext>();
        return (await context.Users.SingleAsync(u => u.Email == email, Ct)).Id;
    }

    public static async Task Assign(this ApiWithDatabase api, string email, Role role)
    {
        using var scope = api.Services.CreateScope();
        var assignRole = scope.ServiceProvider.GetRequiredService<ICommandHandler<AssignRole, bool>>();
        (await assignRole.Handle(new AssignRole(EmailAddress.Create(email).Value!, role, new AccountId(Guid.Empty)), Ct)).IsSuccess.ShouldBeTrue();
    }

    public static async Task Revoke(this ApiWithDatabase api, string email, Role role)
    {
        using var scope = api.Services.CreateScope();
        var revokeRole = scope.ServiceProvider.GetRequiredService<ICommandHandler<RevokeRole, bool>>();
        (await revokeRole.Handle(new RevokeRole(EmailAddress.Create(email).Value!, role, new AccountId(Guid.Empty)), Ct)).IsSuccess.ShouldBeTrue();
    }

    /// <summary>Proposes a pose under a unique name (the database is shared by the tests of a class); returns that name.</summary>
    public static async Task<string> ProposeAPose(this HttpClient contributor)
    {
        var name = $"Throne {Guid.NewGuid():N}"[..20];
        var proposal = new { name, baseDifficulty = "beginner", flyerDifficulty = "discovery", canStartFlow = true, canEndFlow = false };
        (await contributor.PostAsJsonAsync(new Uri("/contribution/pose-proposals", UriKind.Relative), proposal, Ct)).EnsureSuccessStatusCode();
        return name;
    }

    /// <summary>A ProblemDetails of this status whose code (<c>title</c>) is this one.</summary>
    public static async Task ShouldBeAProblem(this HttpResponseMessage response, System.Net.HttpStatusCode status, string code)
    {
        response.StatusCode.ShouldBe(status, await response.Content.ReadAsStringAsync(Ct));
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
        (await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>(Ct)).GetProperty("title").GetString().ShouldBe(code);
    }
}
