using AcroFunJam.Application.Catalog.PrepareNextVideo;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;

namespace AcroFunJam.Worker.Tests;

/// <summary>
/// The loop of the worker (ADR 0041): at once again while videos wait, 5 seconds later when none waits or when a preparation
/// failed unexpectedly; the preparation in progress is cancelled when the worker stops, and the worker ends without error.
/// </summary>
public sealed class VideoPreparationWorkerTests : IAsyncDisposable
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly FakeTimeProvider _clock = new();
    private readonly ScriptedPreparation _preparation = new();
    private readonly ServiceProvider _services;
    private readonly VideoPreparationWorker _worker;

    public VideoPreparationWorkerTests()
    {
        _services = new ServiceCollection().AddSingleton<ICommandHandler<PrepareNextVideo, bool>>(_preparation).BuildServiceProvider();
        _worker = new VideoPreparationWorker(_services.GetRequiredService<IServiceScopeFactory>(), _clock, NullLogger<VideoPreparationWorker>.Instance);
    }

    public async ValueTask DisposeAsync()
    {
        await _worker.StopAsync(CancellationToken.None);
        _worker.Dispose();
        await _services.DisposeAsync();
    }

    [Fact]
    public async Task ExecuteAsync_Should_AskAgainOnlyAfterTheIdleWait_When_NoVideoWaits()
    {
        _preparation.Next(_ => Task.FromResult(false));

        await _worker.StartAsync(Ct);
        await _preparation.Called(1);
        await Task.Delay(TimeSpan.FromMilliseconds(200), Ct);
        _preparation.Calls.ShouldBe(1);

        _clock.Advance(VideoPreparationWorker.Idle);
        await _preparation.Called(2);
    }

    [Fact]
    public async Task ExecuteAsync_Should_AskAgainAtOnce_When_AVideoWasPrepared()
    {
        _preparation.Next(_ => Task.FromResult(true), _ => Task.FromResult(true), _ => Task.FromResult(false));

        await _worker.StartAsync(Ct);

        await _preparation.Called(3);
    }

    [Fact]
    public async Task ExecuteAsync_Should_KeepPreparingAfterTheIdleWait_When_APreparationFailedUnexpectedly()
    {
        _preparation.Next(_ => throw new InvalidOperationException("ffmpeg stopped."), _ => Task.FromResult(false));

        await _worker.StartAsync(Ct);
        await _preparation.Called(1);

        using var limit = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        while (_preparation.Calls < 2)
        {
            _clock.Advance(VideoPreparationWorker.Idle); // until the worker waits: it may not wait yet when the clock moves
            await Task.Delay(10, limit.Token);
        }

        _worker.ExecuteTask!.IsCompleted.ShouldBeFalse();
    }

    [Fact]
    public async Task StopAsync_Should_CancelThePreparationInProgressAndEndWithoutError_When_TheWorkerStops()
    {
        var cancelled = new TaskCompletionSource();
        _preparation.Next(async ct =>
        {
            try
            {
                await Task.Delay(Timeout.Infinite, ct);
            }
            finally
            {
                cancelled.SetResult();
            }

            return true;
        });
        await _worker.StartAsync(Ct);
        await _preparation.Called(1);

        await _worker.StopAsync(Ct);

        cancelled.Task.IsCompleted.ShouldBeTrue();
        _worker.ExecuteTask!.IsCompletedSuccessfully.ShouldBeTrue();
    }

    /// <summary>The preparations, one script per call; the last one is repeated.</summary>
    private sealed class ScriptedPreparation : ICommandHandler<PrepareNextVideo, bool>
    {
        private readonly List<Func<CancellationToken, Task<bool>>> _scripts = [];
        private int _calls;

        public int Calls => Volatile.Read(ref _calls);

        public void Next(params Func<CancellationToken, Task<bool>>[] scripts) => _scripts.AddRange(scripts);

        public async Task<Result<bool>> Handle(PrepareNextVideo command, CancellationToken ct)
        {
            var call = Interlocked.Increment(ref _calls);
            return Result<bool>.Success(await _scripts[Math.Min(call, _scripts.Count) - 1](ct));
        }

        public async Task Called(int times)
        {
            using var limit = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            while (Calls < times) await Task.Delay(10, limit.Token);
        }
    }
}
