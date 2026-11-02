using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AcroFunJam.Specs.Support;

/// <summary>
/// In-memory host of the API, one per scenario (Reqnroll context injection).
/// Our own ports are faked (ADR 0006); @Integration features use the shared PostgreSQL (ADR 0009).
/// </summary>
public sealed class AcroFunJamApiFactory(CatalogTestData catalog) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        if (IntegrationDatabase.ConnectionString is { } connectionString)
        {
            builder.UseSetting("ConnectionStrings:AcroFunJam", connectionString);
        }

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPublishedPosesReader>();
            services.AddSingleton<IPublishedPosesReader>(new SeededPublishedPosesReader(catalog));

            // ADR 0009: the password hash cost is irrelevant to the behaviour under test.
            services.Configure<PasswordHasherOptions>(options => options.IterationCount = 1);
        });
    }
}
