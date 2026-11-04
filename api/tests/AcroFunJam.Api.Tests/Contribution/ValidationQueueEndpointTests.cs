using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>GET /contribution/validation-queue and its counter (ADR 0022), on the real Api and a real PostgreSQL.</summary>
[Trait("Category", "Integration")]
public sealed class ValidationQueueEndpointTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private static readonly Uri ValidationQueue = new("/contribution/validation-queue", UriKind.Relative);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task GetValidationQueue_Should_Answer200WithTheQueueContract_When_AValidatorAsks()
    {
        var (alice, aliceEmail) = await api.SignedIn(Role.User);
        using var _ = alice;
        var name = await alice.ProposeAPose();
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var __ = bruno;

        var response = await bruno.GetAsync(ValidationQueue, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync(Ct));
        var proposal = (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("proposals").EnumerateArray()
            .Single(p => p.GetProperty("name").GetString() == name);
        proposal.GetProperty("id").GetGuid().ShouldNotBe(Guid.Empty);
        proposal.GetProperty("baseDifficulty").GetString().ShouldBe("beginner");
        proposal.GetProperty("flyerDifficulty").GetString().ShouldBe("discovery");
        proposal.GetProperty("canStartFlow").GetBoolean().ShouldBeTrue();
        proposal.GetProperty("canEndFlow").GetBoolean().ShouldBeFalse();
        proposal.GetProperty("contributor").GetProperty("email").GetString().ShouldBe(aliceEmail);
        proposal.GetProperty("contributor").GetProperty("isYou").GetBoolean().ShouldBeFalse();
        proposal.GetProperty("submittedAt").GetDateTimeOffset().ShouldBe(api.Clock.GetUtcNow(), TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task GetValidationQueue_Should_Answer403CapabilityRequired_When_AUserAsks()
    {
        var (alice, _) = await api.SignedIn(Role.User);
        using var _ = alice;

        var response = await alice.GetAsync(ValidationQueue, Ct);

        await response.ShouldBeAProblem(HttpStatusCode.Forbidden, "identity.capability-required");
    }

    [Fact]
    public async Task GetValidationQueue_Should_Answer401_When_AVisitorAsks()
    {
        using var visitor = api.CreateBrowserClient();

        var response = await visitor.GetAsync(ValidationQueue, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
    }

    [Fact]
    public async Task GetValidationQueueCount_Should_Answer200WithTheCount_When_AnAdministratorAsks()
    {
        var (alice, _) = await api.SignedIn(Role.User);
        using var _ = alice;
        await alice.ProposeAPose();
        var (admin, _) = await api.SignedIn(Role.Administrator);
        using var __ = admin;

        // The database is shared by the tests of this class: the count is that of the whole queue.
        var queue = await admin.GetFromJsonAsync<JsonElement>(ValidationQueue, Ct);

        var response = await admin.GetAsync(new Uri("/contribution/validation-queue/count", UriKind.Relative), Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync(Ct));
        (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("count").GetInt32()
            .ShouldBe(queue.GetProperty("proposals").GetArrayLength());
    }
}
