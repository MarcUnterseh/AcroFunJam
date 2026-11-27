using Microsoft.AspNetCore.RateLimiting;
using AcroFunJam.Api.Authentication;
using AcroFunJam.Api.Authorization;
using AcroFunJam.Api.Endpoints.Catalog;
using AcroFunJam.Api.Endpoints.Contribution;
using AcroFunJam.Api.Endpoints.FlowGeneration;
using AcroFunJam.Api.Endpoints.Identity;
using AcroFunJam.Api.OpenApi;
using AcroFunJam.Application;
using AcroFunJam.Infrastructure;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Identity;
using AcroFunJam.Infrastructure.Videos;
using Microsoft.AspNetCore.DataProtection;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi(options => options.AddBearerSecurity());
builder.Services.AddProblemDetails();
builder.Services.AddApplication();
builder.Services.AddSingleton<AcroFunJam.Application.Catalog.IPhotoAddresses, AcroFunJam.Api.Endpoints.Catalog.ApiPhotoAddresses>();
builder.Services.AddSingleton<AcroFunJam.Application.Catalog.IVideoAddresses, AcroFunJam.Api.Endpoints.Catalog.ApiVideoAddresses>();
// 2 sendings of a video at the same time at most, 503 beyond: it bounds the temporary disk and the probes (ADR 0041).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status503ServiceUnavailable;
    options.AddConcurrencyLimiter(VideoEndpoints.UploadsLimit, limiter =>
    {
        limiter.PermitLimit = 2;
        limiter.QueueLimit = 0;
    });
});
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddCapabilityPolicies();
builder.Services.AddHostedService<InitialAdministratorStartup>();
builder.Services.AddHostedService<InitialTagListStartup>();
// The temporary files of a stopped Api are deleted when it starts again (ADR 0041); each host of the tests has its own directory.
builder.Services.AddHostedService<VideoWorkspacePurge>();
builder.Services
    .AddIdentityApiEndpoints<ApplicationUser>(AccountRules.Apply)
    .AddEntityFrameworkStores<AcroFunJamDbContext>();
builder.Services.ConfigureApplicationCookie(SessionCookie.Configure);
// The keys of the session cookie survive a deployment and are shared by every instance (ADR 0040).
builder.Services.AddDataProtection().SetApplicationName("AcroFunJam").PersistKeysToDbContext<AcroFunJamDbContext>();

var app = builder.Build();

// A malformed request body is the client's fault: keep its 400 instead of turning it into a 500.
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    StatusCodeSelector = exception => exception is BadHttpRequestException bad ? bad.StatusCode : StatusCodes.Status500InternalServerError,
});
app.UseStatusCodePages();
app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapGet("/health", () => Results.Ok()).WithName("Health");
app.MapCatalogEndpoints();
app.MapContributionEndpoints();
app.MapIdentityEndpoints();
app.MapFlowGenerationEndpoints();

await app.RunAsync();

/// <summary>Exposed for <c>WebApplicationFactory&lt;Program&gt;</c> in the acceptance tests.</summary>
public partial class Program;
