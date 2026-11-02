using AcroFunJam.Api.Endpoints.Catalog;
using AcroFunJam.Application;
using AcroFunJam.Infrastructure;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapGet("/health", () => Results.Ok()).WithName("Health");
app.MapCatalogEndpoints();

await app.RunAsync();

/// <summary>Exposed for <c>WebApplicationFactory&lt;Program&gt;</c> in the acceptance tests.</summary>
public partial class Program;
