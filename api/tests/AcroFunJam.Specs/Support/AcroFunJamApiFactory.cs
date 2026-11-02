using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace AcroFunJam.Specs.Support;

/// <summary>In-memory host of the API used by the step definitions (inject it in the step classes).</summary>
public sealed class AcroFunJamApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.UseEnvironment("Testing");
}
