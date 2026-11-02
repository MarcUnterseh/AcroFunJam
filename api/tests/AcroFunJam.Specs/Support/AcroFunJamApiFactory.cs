using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Specs.Support.Catalog;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AcroFunJam.Specs.Support;

/// <summary>
/// In-memory host of the API, one per scenario (Reqnroll context injection).
/// The scenario data is plugged in behind the application ports (ADR 0006).
/// </summary>
public sealed class AcroFunJamApiFactory(CatalogTestData catalog) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IPublishedPosesReader>();
            services.AddSingleton<IPublishedPosesReader>(new SeededPublishedPosesReader(catalog));
        });
    }
}
