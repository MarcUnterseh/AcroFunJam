using AcroFunJam.Application.Catalog.PrepareNextVideo;
using AcroFunJam.Application.Common;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace AcroFunJam.Worker.Tests;

/// <summary>
/// The composition root of the worker (ADR 0041): the handlers of the Api are registered without their adapters of presentation,
/// so the container is not validated at build; this test resolves, instead, what the worker runs.
/// </summary>
public sealed class WorkerProgramTests
{
    [Fact]
    public async Task CreateBuilder_Should_ComposeThePreparationOfTheVideosAndItsHostedServices_When_TheWorkerStarts()
    {
        using var host = WorkerProgram.CreateBuilder(
        [
            "--environment", "Production",
            "--ConnectionStrings:AcroFunJam", "Host=localhost;Database=acrofunjam;Username=acrofunjam;Password=unused",
            "--PhotoStorage:ServiceUrl", "http://localhost:9000",
            "--PhotoStorage:Bucket", "acrofunjam-photos",
            "--PhotoStorage:AccessKey", "unused",
            "--PhotoStorage:SecretKey", "unused",
        ]).Build();

        await using var scope = host.Services.CreateAsyncScope();
        scope.ServiceProvider.GetRequiredService<ICommandHandler<PrepareNextVideo, bool>>().ShouldNotBeNull();
        host.Services.GetServices<IHostedService>().Select(s => s.GetType().Name)
            .ShouldBe(["VideoWorkspacePurge", nameof(VideoPreparationWorker)], ignoreOrder: true);
    }
}
