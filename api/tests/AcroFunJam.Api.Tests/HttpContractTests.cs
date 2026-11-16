using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace AcroFunJam.Api.Tests;

/// <summary>Cross-cutting behaviour of the HTTP contract (ADR 0007), independent of any bounded context.</summary>
public sealed class HttpContractTests(HttpContractTests.DevelopmentApi api) : IClassFixture<HttpContractTests.DevelopmentApi>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Theory]
    [InlineData("{}")]
    [InlineData("{ not json")]
    public async Task Post_Should_Return400ProblemDetails_When_TheBodyIsMalformed(string body)
    {
        using var client = api.CreateClient();
        using var content = new StringContent(body, Encoding.UTF8, "application/json");

        var response = await client.PostAsync(new Uri("/identity/register", UriKind.Relative), content, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
    }

    [Fact]
    public async Task OpenApiDocument_Should_DeclareTheBearerScheme_When_TheApiHasProtectedEndpoints()
    {
        using var client = api.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>(new Uri("/openapi/v1.json", UriKind.Relative), Ct);

        var bearer = document.GetProperty("components").GetProperty("securitySchemes").GetProperty("Bearer");
        bearer.GetProperty("type").GetString().ShouldBe("http");
        bearer.GetProperty("scheme").GetString().ShouldBe("bearer");
    }

    [Fact]
    public async Task OpenApiDocument_Should_RequireTheBearerScheme_When_AnOperationIsProtected()
    {
        using var client = api.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>(new Uri("/openapi/v1.json", UriKind.Relative), Ct);
        var paths = document.GetProperty("paths");

        HasBearerRequirement(paths.GetProperty("/me").GetProperty("get")).ShouldBeTrue();
        HasBearerRequirement(paths.GetProperty("/identity/role-assignments").GetProperty("post")).ShouldBeTrue();
        HasBearerRequirement(paths.GetProperty("/catalog/poses").GetProperty("get")).ShouldBeFalse();
    }

    [Fact]
    public async Task OpenApiDocument_Should_RequireTheFlowIndicators_When_DescribingAPoseOfTheCatalog()
    {
        using var client = api.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>(new Uri("/openapi/v1.json", UriKind.Relative), Ct);
        var pose = document.GetProperty("components").GetProperty("schemas").GetProperty("PoseSummaryResponse");

        pose.GetProperty("required").EnumerateArray().Select(p => p.GetString())
            .ShouldBe(["id", "name", "baseDifficulty", "flyerDifficulty", "canStartFlow", "canEndFlow"], ignoreOrder: true);
        pose.GetProperty("properties").GetProperty("canStartFlow").GetProperty("type").GetString().ShouldBe("boolean");
        pose.GetProperty("properties").GetProperty("canEndFlow").GetProperty("type").GetString().ShouldBe("boolean");
    }

    [Fact]
    public async Task OpenApiDocument_Should_DescribeThePoseProposal_When_TheContributionContextIsExposed()
    {
        using var client = api.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>(new Uri("/openapi/v1.json", UriKind.Relative), Ct);
        var paths = document.GetProperty("paths");
        var schemas = document.GetProperty("components").GetProperty("schemas");

        var propose = paths.GetProperty("/contribution/pose-proposals").GetProperty("post");
        HasBearerRequirement(propose).ShouldBeTrue();
        var responses = propose.GetProperty("responses");
        foreach (var status in new[] { "201", "400", "401", "403", "409" })
        {
            responses.TryGetProperty(status, out _).ShouldBeTrue($"response {status} is documented");
        }

        responses.GetProperty("409").GetProperty("content").TryGetProperty("application/problem+json", out _).ShouldBeTrue();
        schemas.GetProperty("PoseProposalResponse").GetProperty("required").EnumerateArray().Select(p => p.GetString())
            .ShouldBe(["id", "status", "name", "baseDifficulty", "flyerDifficulty", "canStartFlow", "canEndFlow"], ignoreOrder: true);
        schemas.GetProperty("ProposalStatusCode").GetProperty("enum").EnumerateArray().Select(v => v.GetString())
            .ShouldBe(["pending", "accepted", "rejected"], ignoreOrder: true);
    }

    [Theory]
    [InlineData("/contribution/validation-queue", "get", new[] { "200", "401", "403" })]
    [InlineData("/contribution/validation-queue/count", "get", new[] { "200", "401", "403" })]
    [InlineData("/contribution/pose-proposals/{id}/acceptance", "post", new[] { "200", "400", "401", "403", "404", "409", "422" })]
    [InlineData("/contribution/pose-proposals/{id}/rejection", "post", new[] { "200", "400", "401", "403", "404", "409" })]
    [InlineData("/contribution/my-proposals", "get", new[] { "200", "401", "403" })]
    [InlineData("/contribution/pose-revision-proposals/pending", "get", new[] { "200", "400", "401", "403" })]
    [InlineData("/contribution/transition-proposals", "post", new[] { "201", "400", "401", "403", "404", "409" })]
    [InlineData("/contribution/transition-proposals/{id}/acceptance", "post", new[] { "200", "400", "401", "403", "404", "409", "422" })]
    [InlineData("/contribution/transition-proposals/{id}/rejection", "post", new[] { "200", "400", "401", "403", "404", "409" })]
    public async Task OpenApiDocument_Should_DescribeTheContributionOperations_When_TheyRequireASignedInPerson(
        string path, string method, string[] statuses)
    {
        using var client = api.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>(new Uri("/openapi/v1.json", UriKind.Relative), Ct);
        var operation = document.GetProperty("paths").GetProperty(path).GetProperty(method);

        HasBearerRequirement(operation).ShouldBeTrue();
        var responses = operation.GetProperty("responses");
        foreach (var status in statuses)
        {
            responses.TryGetProperty(status, out _).ShouldBeTrue($"response {status} is documented");
        }
    }

    [Fact]
    public async Task OpenApiDocument_Should_DescribeAnOptionalBodyOfAdjustments_When_AcceptingAProposal()
    {
        using var client = api.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>(new Uri("/openapi/v1.json", UriKind.Relative), Ct);
        var body = document.GetProperty("paths").GetProperty("/contribution/pose-proposals/{id}/acceptance").GetProperty("post")
            .GetProperty("requestBody");
        var schemas = document.GetProperty("components").GetProperty("schemas");

        // Without body, or with every field absent, the proposal is accepted as proposed (ADR 0022).
        (body.TryGetProperty("required", out var required) && required.GetBoolean()).ShouldBeFalse();
        var adjustments = schemas.GetProperty("AcceptPoseProposalRequest");
        adjustments.GetProperty("properties").EnumerateObject().Select(p => p.Name)
            .ShouldBe(["name", "baseDifficulty", "flyerDifficulty", "canStartFlow", "canEndFlow", "message"], ignoreOrder: true);
        adjustments.TryGetProperty("required", out _).ShouldBeFalse("every field may be absent");
        schemas.GetProperty("AcceptedPoseProposalResponse").GetProperty("required").EnumerateArray().Select(p => p.GetString())
            .ShouldBe(["id", "status", "adjusted", "name", "baseDifficulty", "flyerDifficulty", "canStartFlow", "canEndFlow"], ignoreOrder: true);
    }

    [Fact]
    public async Task OpenApiDocument_Should_DescribeMyProposals_When_TheContributorFollowsTheirProposals()
    {
        using var client = api.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>(new Uri("/openapi/v1.json", UriKind.Relative), Ct);
        var schemas = document.GetProperty("components").GetProperty("schemas");

        // Every member is always written, null when it does not apply (ADR 0023): the front tells "absent" from "outdated".
        schemas.GetProperty("MyProposalResponseMyPoseProposalResponse").GetProperty("required").EnumerateArray().Select(p => p.GetString())
            .ShouldBe(
                [
                    "id", "status", "name", "baseDifficulty", "flyerDifficulty", "canStartFlow", "canEndFlow", "submittedAt", "decidedAt",
                    "adjustments", "message", "reason",
                ],
                ignoreOrder: true);
        schemas.GetProperty("MyProposalStatusCode").GetProperty("enum").EnumerateArray().Select(v => v.GetString())
            .ShouldBe(["pending", "accepted", "accepted-with-adjustments", "rejected", "published-directly"], ignoreOrder: true);
        schemas.GetProperty("PoseAdjustmentsResponse").GetProperty("properties").EnumerateObject().Select(p => p.Name)
            .ShouldBe(["name", "baseDifficulty", "flyerDifficulty", "canStartFlow", "canEndFlow"], ignoreOrder: true);
    }

    /// <summary>Story 7 (ADR 0030): deciding on a transition proposal, and its kind in the queue and in « Mes propositions ».</summary>
    [Fact]
    public async Task OpenApiDocument_Should_DescribeTheTransitionProposals_When_TheyAreProposedAndDecided()
    {
        using var client = api.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>(new Uri("/openapi/v1.json", UriKind.Relative), Ct);
        var schemas = document.GetProperty("components").GetProperty("schemas");
        var body = document.GetProperty("paths").GetProperty("/contribution/transition-proposals/{id}/acceptance").GetProperty("post")
            .GetProperty("requestBody");

        // Without body, or with every field absent, the transition is accepted as proposed; "" removes the name or the description.
        (body.TryGetProperty("required", out var required) && required.GetBoolean()).ShouldBeFalse();
        var adjustments = schemas.GetProperty("AcceptTransitionProposalRequest");
        adjustments.GetProperty("properties").EnumerateObject().Select(p => p.Name)
            .ShouldBe(["name", "baseDifficulty", "flyerDifficulty", "description", "message"], ignoreOrder: true);
        adjustments.TryGetProperty("required", out _).ShouldBeFalse("every field may be absent");
        schemas.GetProperty("PendingProposalResponsePendingTransitionProposalResponse").GetProperty("required").EnumerateArray()
            .Select(p => p.GetString())
            .ShouldBe(
                ["id", "fromPose", "toPose", "name", "baseDifficulty", "flyerDifficulty", "description", "contributor", "submittedAt"], ignoreOrder: true);
        schemas.GetProperty("MyProposalResponseMyTransitionProposalResponse").GetProperty("required").EnumerateArray().Select(p => p.GetString())
            .ShouldBe(
                [
                    "id", "status", "fromPose", "toPose", "name", "baseDifficulty", "flyerDifficulty", "description", "submittedAt", "decidedAt",
                    "adjustments", "message", "reason",
                ],
                ignoreOrder: true);
    }

    /// <summary>Story 7 (ADR 0030): the page of a pose lists its transitions from and to it, always written.</summary>
    [Fact]
    public async Task OpenApiDocument_Should_DescribeTheTransitionsOfAPose_When_ItsPageIsRead()
    {
        using var client = api.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>(new Uri("/openapi/v1.json", UriKind.Relative), Ct);
        var schemas = document.GetProperty("components").GetProperty("schemas");

        schemas.GetProperty("PublishedPoseResponse").GetProperty("required").EnumerateArray().Select(p => p.GetString())
            .ShouldBe(
                ["id", "name", "baseDifficulty", "flyerDifficulty", "canStartFlow", "canEndFlow", "version", "transitionsFrom", "transitionsTo"],
                ignoreOrder: true);
        schemas.GetProperty("LinkedTransitionResponse").GetProperty("required").EnumerateArray().Select(p => p.GetString())
            .ShouldBe(["id", "otherPose", "name", "baseDifficulty", "flyerDifficulty", "description"], ignoreOrder: true);
    }

    /// <summary>Story 6: « Mes propositions » is read at /contribution/my-proposals only, which replaces the endpoint of story 5.</summary>
    [Fact]
    public async Task OpenApiDocument_Should_NoLongerDescribeMyPoseProposals_When_MyProposalsReplacesIt()
    {
        using var client = api.CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>(new Uri("/openapi/v1.json", UriKind.Relative), Ct);

        document.GetProperty("paths").TryGetProperty("/contribution/my-pose-proposals", out _).ShouldBeFalse();
    }

    private static bool HasBearerRequirement(JsonElement operation) =>
        operation.TryGetProperty("security", out var security)
        && security.EnumerateArray().Any(requirement => requirement.TryGetProperty("Bearer", out _));

    /// <summary>The OpenAPI document is only published in Development.</summary>
    public sealed class DevelopmentApi : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("Catalog:SeedInitialTagList", "false"); // no database here
        }
    }
}
