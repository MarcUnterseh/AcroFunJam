using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Identity.AssignRole;
using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>POST /contribution/pose-proposals (ADR 0018), on the real Api and a real PostgreSQL.</summary>
[Trait("Category", "Integration")]
public sealed class PoseProposalEndpointTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private const string Password = "une phrase de passe";
    private static readonly Uri PoseProposals = new("/contribution/pose-proposals", UriKind.Relative);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private async Task<(HttpClient Browser, string Email)> SignedInUser()
    {
        var email = $"alice-{Guid.NewGuid():N}@example.org";
        var browser = api.CreateBrowserClient();
        (await browser.PostAsJsonAsync(new Uri("/identity/register", UriKind.Relative), new { email, password = Password }, Ct)).EnsureSuccessStatusCode();
        (await browser.PostAsJsonAsync(new Uri("/identity/login?useCookies=true", UriKind.Relative), new { email, password = Password }, Ct)).EnsureSuccessStatusCode();
        return (browser, email);
    }

    /// <summary>A unique, valid pose name (the database is shared by the tests of this class).</summary>
    private static string AFreeName() => $"Throne {Guid.NewGuid():N}"[..20];

    private static object AProposal(string name) =>
        new { name, baseDifficulty = "beginner", flyerDifficulty = "discovery", canStartFlow = true, canEndFlow = false };

    [Fact]
    public async Task Post_Should_Return201Pending_When_AUserProposesAPose()
    {
        var (browser, _) = await SignedInUser();
        using var _ = browser;
        var name = AFreeName();

        var response = await browser.PostAsJsonAsync(PoseProposals, AProposal(name), Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Created, await response.Content.ReadAsStringAsync(Ct));
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        body.GetProperty("id").GetGuid().ShouldNotBe(Guid.Empty);
        body.GetProperty("status").GetString().ShouldBe("pending");
        body.GetProperty("name").GetString().ShouldBe(name);
        body.GetProperty("baseDifficulty").GetString().ShouldBe("beginner");
        body.GetProperty("flyerDifficulty").GetString().ShouldBe("discovery");
        body.GetProperty("canStartFlow").GetBoolean().ShouldBeTrue();
        body.GetProperty("canEndFlow").GetBoolean().ShouldBeFalse();
        response.Headers.Location.ShouldBeNull();
    }

    [Fact]
    public async Task Post_Should_Return201Accepted_When_AValidatorProposesAPose()
    {
        var (browser, email) = await SignedInUser();
        using var _ = browser;
        using (var scope = api.Services.CreateScope())
        {
            var assignRole = scope.ServiceProvider.GetRequiredService<ICommandHandler<AssignRole, bool>>();
            (await assignRole.Handle(new AssignRole(EmailAddress.Create(email).Value!, Role.Validator, new AccountId(Guid.Empty)), Ct))
                .IsSuccess.ShouldBeTrue();
        }

        var response = await browser.PostAsJsonAsync(PoseProposals, AProposal(AFreeName()), Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Created, await response.Content.ReadAsStringAsync(Ct));
        (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("status").GetString().ShouldBe("accepted");
    }

    public static TheoryData<string, string> InadmissibleBodies() => new()
    {
        { """{ "name": "Throne", "baseDifficulty": "expert", "flyerDifficulty": "discovery", "canStartFlow": true, "canEndFlow": true }""", "pose.unknown-difficulty-level" },
        { """{ "name": "Throne", "baseDifficulty": null, "flyerDifficulty": "discovery", "canStartFlow": true, "canEndFlow": true }""", "pose.base-difficulty-required" },
        { """{ "name": "Throne", "baseDifficulty": "beginner", "flyerDifficulty": "discovery", "canEndFlow": true }""", "pose.can-start-flow-required" },
        { """{ "name": "   ", "baseDifficulty": "beginner", "flyerDifficulty": "discovery", "canStartFlow": true, "canEndFlow": true }""", "pose.name-required" },
    };

    [Theory]
    [MemberData(nameof(InadmissibleBodies))]
    public async Task Post_Should_Return400WithTheBusinessCode_When_TheContentIsInadmissible(string body, string code)
    {
        var (browser, _) = await SignedInUser();
        using var _ = browser;
        using var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

        var response = await browser.PostAsync(PoseProposals, content, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
        (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("title").GetString().ShouldBe(code);
    }

    [Fact]
    public async Task Post_Should_Return401ProblemDetails_When_TheCallerIsAVisitor()
    {
        using var visitor = api.CreateBrowserClient();

        var response = await visitor.PostAsJsonAsync(PoseProposals, AProposal(AFreeName()), Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
    }

    [Fact]
    public async Task Post_Should_Return401ProblemDetails_When_TheAccountWasDeletedAfterSigningIn()
    {
        var (browser, email) = await SignedInUser();
        using var _ = browser;
        using (var scope = api.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AcroFunJamDbContext>();
            await context.Users.Where(u => u.Email == email).ExecuteDeleteAsync(Ct);
        }

        var response = await browser.PostAsJsonAsync(PoseProposals, AProposal(AFreeName()), Ct);

        await ShouldBeAccountDeleted(response);
    }

    [Fact]
    public async Task RoleAssignment_Should_Return401_When_TheAccountWasDeletedAfterSigningIn()
    {
        var (browser, email) = await SignedInUser();
        using var _ = browser;
        using (var scope = api.Services.CreateScope())
        {
            var assignRole = scope.ServiceProvider.GetRequiredService<ICommandHandler<AssignRole, bool>>();
            (await assignRole.Handle(new AssignRole(EmailAddress.Create(email).Value!, Role.Administrator, new AccountId(Guid.Empty)), Ct))
                .IsSuccess.ShouldBeTrue();
            var context = scope.ServiceProvider.GetRequiredService<AcroFunJamDbContext>();
            await context.Users.Where(u => u.Email == email).ExecuteDeleteAsync(Ct);
        }

        var response = await browser.PostAsJsonAsync(
            new Uri("/identity/role-assignments", UriKind.Relative), new { email = "bruno@example.org", role = "validator" }, Ct);

        await ShouldBeAccountDeleted(response);
    }

    private static async Task ShouldBeAccountDeleted(HttpResponseMessage response)
    {
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
        (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("title").GetString().ShouldBe("identity.account-deleted");
    }
}
