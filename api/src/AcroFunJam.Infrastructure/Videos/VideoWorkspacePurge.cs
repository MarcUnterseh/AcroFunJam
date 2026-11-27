using Microsoft.Extensions.Hosting;

namespace AcroFunJam.Infrastructure.Videos;

/// <summary>
/// Empties the local directories of the videos when the Api or the worker starts (ADR 0041): the files left by a host stopped in
/// the middle of a sending or of a preparation never pile up.
/// </summary>
public sealed class VideoWorkspacePurge(VideoProcessingOptions options) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        Empty(options.UploadDirectory);
        Empty(options.WorkDirectory);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public static void Empty(string directory)
    {
        if (Directory.Exists(directory)) Directory.Delete(directory, recursive: true);
        Directory.CreateDirectory(directory);
    }
}
