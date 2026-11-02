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

    private static bool HasBearerRequirement(JsonElement operation) =>
        operation.TryGetProperty("security", out var security)
        && security.EnumerateArray().Any(requirement => requirement.TryGetProperty("Bearer", out _));

    /// <summary>The OpenAPI document is only published in Development.</summary>
    public sealed class DevelopmentApi : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.UseEnvironment("Development");
    }
}
