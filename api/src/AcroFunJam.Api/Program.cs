using AcroFunJam.Api.Authentication;
using AcroFunJam.Api.Authorization;
using AcroFunJam.Api.Endpoints.Catalog;
using AcroFunJam.Api.Endpoints.Identity;
using AcroFunJam.Api.OpenApi;
using AcroFunJam.Application;
using AcroFunJam.Infrastructure;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Identity;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi(options => options.AddBearerSecurity());
builder.Services.AddProblemDetails();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddCapabilityPolicies();
builder.Services.AddHostedService<InitialAdministratorStartup>();
builder.Services
    .AddIdentityApiEndpoints<ApplicationUser>(AccountRules.Apply)
    .AddEntityFrameworkStores<AcroFunJamDbContext>();
builder.Services.ConfigureApplicationCookie(SessionCookie.Configure);

var app = builder.Build();

// A malformed request body is the client's fault: keep its 400 instead of turning it into a 500.
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    StatusCodeSelector = exception => exception is BadHttpRequestException bad ? bad.StatusCode : StatusCodes.Status500InternalServerError,
});
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapGet("/health", () => Results.Ok()).WithName("Health");
app.MapCatalogEndpoints();
app.MapIdentityEndpoints();

await app.RunAsync();

/// <summary>Exposed for <c>WebApplicationFactory&lt;Program&gt;</c> in the acceptance tests.</summary>
public partial class Program;
