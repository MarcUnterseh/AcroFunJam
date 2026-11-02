using AcroFunJam.Api.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Architecture.Tests;

/// <summary>Security rules of the Api, checked on the real endpoint table (ADR 0008).</summary>
public sealed class ApiSecurityTests : IClassFixture<ApiSecurityTests.ApiFactory>
{
    // Endpoints of ASP.NET Core Identity that must be reachable anonymously.
    private static readonly string[] AnonymousWriteEndpoints =
    [
        "/identity/register", "/identity/login", "/identity/refresh", "/identity/confirmEmail",
        "/identity/resendConfirmationEmail", "/identity/forgotPassword", "/identity/resetPassword",
    ];

    private static readonly string[] CapabilityPolicies = [Capabilities.CanPropose, Capabilities.CanValidate, Capabilities.CanManageRoles];

    private readonly IReadOnlyList<RouteEndpoint> _endpoints;

    public ApiSecurityTests(ApiFactory api)
    {
        ArgumentNullException.ThrowIfNull(api);
        _endpoints = [.. api.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()];
    }

    [Fact]
    public void WriteEndpoints_Should_RequireAuthorization_When_NotAnIdentityLibraryEntryPoint()
    {
        _endpoints
            .Where(e => e.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods.Any(m => m != HttpMethods.Get) == true)
            .Where(e => !AnonymousWriteEndpoints.Contains("/" + e.RoutePattern.RawText?.TrimStart('/'), StringComparer.Ordinal))
            .Where(e => e.Metadata.GetOrderedMetadata<IAuthorizeData>().Count == 0)
            .Select(e => e.RoutePattern.RawText)
            .ShouldBeEmpty();
    }

    [Fact]
    public void Authorization_Should_UseCapabilityPolicies_When_AnEndpointIsProtected()
    {
        var authorizations = _endpoints.SelectMany(e => e.Metadata.GetOrderedMetadata<IAuthorizeData>()).ToList();

        authorizations.Where(a => !string.IsNullOrEmpty(a.Roles)).ShouldBeEmpty("authorize capabilities, never roles");
        authorizations
            .Where(a => a.Policy is not null && !CapabilityPolicies.Contains(a.Policy, StringComparer.Ordinal))
            .Select(a => a.Policy)
            .ShouldBeEmpty();
    }

    public sealed class ApiFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.UseEnvironment("Testing");
    }
}
