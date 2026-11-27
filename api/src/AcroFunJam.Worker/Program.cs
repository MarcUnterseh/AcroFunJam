using AcroFunJam.Application;
using AcroFunJam.Infrastructure;
using AcroFunJam.Infrastructure.Videos;

namespace AcroFunJam.Worker;

/// <summary>
/// The composition root of the worker (ADR 0041): the use cases and the adapters of the Api, a purge of the work files at start,
/// and the preparation of the videos, one at a time. Named so that it never mistakes itself for the <c>Program</c> of the Api.
/// </summary>
public static class WorkerProgram
{
    public static async Task Main(string[] args) => await CreateBuilder(args).Build().RunAsync();

    /// <summary>The host of the worker, composed (its composition is tested: the container is not validated at build).</summary>
    public static HostApplicationBuilder CreateBuilder(string[] args)
    {
        var builder = Host.CreateApplicationBuilder(args);

        builder.Services.AddApplication();
        builder.Services.AddInfrastructure(builder.Configuration);
        // The handlers of the Api (addresses of the files) are registered but never resolved here: only the preparation runs.
        builder.ConfigureContainer(new DefaultServiceProviderFactory(new ServiceProviderOptions { ValidateOnBuild = false, ValidateScopes = true }));
        builder.Services.AddHostedService<VideoWorkspacePurge>();
        builder.Services.AddHostedService<VideoPreparationWorker>();
        return builder;
    }
}
