using AcroFunJam.Application.Catalog.PrepareNextVideo;
using AcroFunJam.Application.Common;

namespace AcroFunJam.Worker;

/// <summary>
/// Prepares the videos one at a time (ADR 0041): calls the use case <see cref="PrepareNextVideo"/> in a scope of its own, again at
/// once while videos wait, after 5 seconds when none waits or when a preparation failed unexpectedly (its job is claimed again
/// once its lease expires). When the worker stops, the preparation in progress is cancelled, and its job given back by the use case.
/// </summary>
public sealed partial class VideoPreparationWorker(IServiceScopeFactory scopes, TimeProvider clock, ILogger<VideoPreparationWorker> logger)
    : BackgroundService
{
    /// <summary>The wait when no video waits (no LISTEN/NOTIFY at first, ADR 0041).</summary>
    public static readonly TimeSpan Idle = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var handled = false;
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var prepare = scope.ServiceProvider.GetRequiredService<ICommandHandler<PrepareNextVideo, bool>>();
                handled = (await prepare.Handle(new PrepareNextVideo(), stoppingToken)).Value;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
#pragma warning disable CA1031 // The worker survives a failed preparation: the job is claimed again when its lease expires.
            catch (Exception e)
#pragma warning restore CA1031
            {
                LogPreparationFailed(logger, e);
            }

            if (handled) continue;
            try
            {
                await Task.Delay(Idle, clock, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "A preparation of a video failed; it will be claimed again when its lease expires.")]
    private static partial void LogPreparationFailed(ILogger logger, Exception exception);
}
