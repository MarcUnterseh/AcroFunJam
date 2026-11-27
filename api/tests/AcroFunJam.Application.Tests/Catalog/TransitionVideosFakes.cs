using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>Fake of <see cref="ITransitionVideosRepository"/>: the videos of each transition, in memory.</summary>
internal sealed class FakeTransitionVideosRepository : ITransitionVideosRepository
{
    public Dictionary<TransitionId, TransitionVideos> Stored { get; } = [];

    public List<TransitionVideos> Saved { get; } = [];

    public Task<TransitionVideos> GetFor(TransitionId transition, CancellationToken ct) =>
        Task.FromResult(Stored.GetValueOrDefault(transition) ?? TransitionVideos.For(transition));

    public Task<IReadOnlyDictionary<TransitionId, TransitionVideos>> GetFor(IReadOnlyCollection<TransitionId> transitions, CancellationToken ct) =>
        Task.FromResult<IReadOnlyDictionary<TransitionId, TransitionVideos>>(
            Stored.Where(s => transitions.Contains(s.Key)).ToDictionary(s => s.Key, s => s.Value));

    public Task<TransitionVideos?> FindByVideo(VideoId video, CancellationToken ct) =>
        Task.FromResult(Stored.Values.FirstOrDefault(t => t.InAdditionOrder().Any(v => v.Id == video)));

    public void Save(TransitionVideos videos)
    {
        Stored[videos.Id] = videos;
        Saved.Add(videos);
    }

    public Video Single(TransitionId transition) => Stored[transition].InAdditionOrder().Single();
}

/// <summary>Fake of <see cref="ITransitionVideosLock"/>: records the transitions locked.</summary>
internal sealed class FakeTransitionVideosLock : ITransitionVideosLock
{
    public List<TransitionId> Locked { get; } = [];

    /// <summary>Called when the lock is taken (e.g. to add a video concurrently).</summary>
    public Action? OnLock { get; set; }

    public Task<Result<T>> Run<T>(TransitionId transition, Func<CancellationToken, Task<Result<T>>> work, CancellationToken ct)
    {
        Locked.Add(transition);
        OnLock?.Invoke();
        return work(ct);
    }
}

/// <summary>Fake of <see cref="IVideoProcessor"/>: finds what it is told to find, and prepares what it is told to prepare.</summary>
internal sealed class FakeVideoProcessor : IVideoProcessor
{
    public VideoProbe Probe { get; set; } =
        new(VideoFormat.Mp4, new VideoDimensions(1920, 1080), VideoDuration.FromMilliseconds(12_000));

    /// <summary>The preparation finds the video damaged.</summary>
    public bool Damaged { get; set; }

    /// <summary>The preparation throws (ffmpeg stopped, the worker shut down).</summary>
    public bool Crashes { get; set; }

    /// <summary>The decoded duration, when it differs from the one found at the demultiplexing.</summary>
    public VideoDuration? DecodedDuration { get; set; }

    /// <summary>Called during the preparation (e.g. the worker asked to stop).</summary>
    public Action? DuringPreparation { get; set; }

    public List<string> Probed { get; } = [];

    public List<(string Original, VideoDimensions Presented)> Prepared { get; } = [];

    public int CleanedUp { get; private set; }

    Task<VideoProbe> IVideoProcessor.Probe(string path, CancellationToken ct)
    {
        Probed.Add(path);
        return Task.FromResult(Probe);
    }

    public Task<Result<PreparedVideoFiles>> Prepare(string originalPath, VideoDimensions presented, CancellationToken ct)
    {
        Prepared.Add((originalPath, presented));
        DuringPreparation?.Invoke();
        ct.ThrowIfCancellationRequested();
        if (Crashes) throw new InvalidOperationException("ffmpeg stopped.");
        if (Damaged) return Task.FromResult<Result<PreparedVideoFiles>>(VideoContentErrors.Unreadable);
        var outcome = new PreparedVideo(presented, DecodedDuration ?? Probe.Duration!);
        return Task.FromResult(Result<PreparedVideoFiles>.Success(new PreparedVideoFiles("prepared.mp4", "poster.webp", outcome, () =>
        {
            CleanedUp++;
            return ValueTask.CompletedTask;
        })));
    }
}

/// <summary>Fake of <see cref="IVideoStorage"/>: the files of each video, in memory.</summary>
internal sealed class FakeVideoStorage : IVideoStorage
{
    public Dictionary<VideoId, string> Originals { get; } = [];

    public Dictionary<VideoId, PreparedVideo> Prepared { get; } = [];

    public List<VideoId> DeletedOriginals { get; } = [];

    public List<VideoId> Deleted { get; } = [];

    public int FetchesCleanedUp { get; private set; }

    public Dictionary<(VideoId, VideoRendition), byte[]> Contents { get; } = [];

    public Task StoreOriginal(VideoId video, string path, CancellationToken ct)
    {
        Originals[video] = path;
        return Task.CompletedTask;
    }

    public Task<TemporaryVideoFile?> FetchOriginal(VideoId video, CancellationToken ct) =>
        Task.FromResult(Originals.ContainsKey(video)
            ? new TemporaryVideoFile($"fetched-{video.Value}", () =>
            {
                FetchesCleanedUp++;
                return ValueTask.CompletedTask;
            })
            : null);

    public Task StorePrepared(VideoId video, PreparedVideoFiles files, CancellationToken ct)
    {
        Prepared[video] = files.Outcome;
        return Task.CompletedTask;
    }

    public Task<VideoContent?> Open(VideoId video, VideoRendition rendition, ByteRange? range, CancellationToken ct)
    {
        if (!Contents.TryGetValue((video, rendition), out var content)) return Task.FromResult<VideoContent?>(null);
        if (range is null) return Task.FromResult<VideoContent?>(new VideoContent(new MemoryStream(content), content.Length, null));
        if (range.Within(content.Length) is not { } within) return Task.FromResult<VideoContent?>(VideoContent.RangeNotSatisfiable(content.Length));
        var (first, last) = within;
        return Task.FromResult<VideoContent?>(new VideoContent(new MemoryStream(content[(int)first..((int)last + 1)]), content.Length, within));
    }

    public Task DeleteOriginal(VideoId video, CancellationToken ct)
    {
        Originals.Remove(video);
        DeletedOriginals.Add(video);
        return Task.CompletedTask;
    }

    public Task Delete(VideoId video, CancellationToken ct)
    {
        Originals.Remove(video);
        Prepared.Remove(video);
        Deleted.Add(video);
        return Task.CompletedTask;
    }
}

/// <summary>Fake of <see cref="IVideoAddresses"/>: the paths of the API (ADR 0041).</summary>
internal sealed class FakeVideoAddresses : IVideoAddresses
{
    public VideoSources Of(VideoId video) => new($"/catalog/videos/{video.Value}/video", $"/catalog/videos/{video.Value}/poster");
}

/// <summary>Fake of <see cref="IVideoPreparationQueue"/>: the jobs in memory, claimed in the order they were added.</summary>
internal sealed class FakeVideoPreparationQueue : IVideoPreparationQueue
{
    public List<VideoPreparationJob> Jobs { get; } = [];

    public void Enqueue(VideoId video, TransitionId transition, DateTimeOffset at) => Jobs.Add(new VideoPreparationJob(video, transition, 0));

    public Task<VideoPreparationJob?> Claim(CancellationToken ct)
    {
        if (Jobs.Count == 0) return Task.FromResult<VideoPreparationJob?>(null);
        var claimed = Jobs[0] with { Attempts = Jobs[0].Attempts + 1 };
        Jobs[0] = claimed;
        return Task.FromResult<VideoPreparationJob?>(claimed);
    }

    public void Complete(VideoId video) => Jobs.RemoveAll(j => j.Video == video);

    public List<VideoId> Released { get; } = [];

    public Task Release(VideoId video, CancellationToken ct)
    {
        Released.Add(video);
        var index = Jobs.FindIndex(j => j.Video == video);
        if (index >= 0) Jobs[index] = Jobs[index] with { Attempts = Jobs[index].Attempts - 1 };
        return Task.CompletedTask;
    }
}
