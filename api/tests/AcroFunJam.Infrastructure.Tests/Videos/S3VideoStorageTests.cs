using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Infrastructure.Photos;
using AcroFunJam.Infrastructure.Videos;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using Microsoft.Extensions.Logging.Abstractions;

namespace AcroFunJam.Infrastructure.Tests.Videos;

/// <summary>
/// The storage of the files of the videos in the bucket of the photos (story 12, ADR 0041), on RustFS: the original waits for its
/// preparation under a private prefix; the prepared files are read whole or by ranges; a deletion is at best.
/// </summary>
[Trait("Category", "Integration")]
public sealed class S3VideoStorageTests : IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private const string AccessKey = "acrofunjam";
    private const string SecretKey = "acrofunjam-secret";

    private readonly IContainer _rustfs = new ContainerBuilder("rustfs/rustfs:1.0.4")
        .WithEnvironment("RUSTFS_ACCESS_KEY", AccessKey)
        .WithEnvironment("RUSTFS_SECRET_KEY", SecretKey)
        .WithPortBinding(9000, assignRandomHostPort: true)
        .WithWaitStrategy(Wait.ForUnixContainer().UntilInternalTcpPortIsAvailable(9000))
        .Build();

    private readonly string _directory = Path.Combine(Path.GetTempPath(), "acrofunjam-tests-" + Guid.NewGuid());
    private S3VideoStorage _storage = null!;

    public async ValueTask InitializeAsync()
    {
        await _rustfs.StartAsync(Ct);
        var options = new PhotoStorageOptions
        {
            ServiceUrl = $"http://{_rustfs.Hostname}:{_rustfs.GetMappedPublicPort(9000)}",
            Bucket = "acrofunjam-photos",
            AccessKey = AccessKey,
            SecretKey = SecretKey,
        };
        _storage = new S3VideoStorage(options, new VideoProcessingOptions { WorkDirectory = _directory }, NullLogger<S3VideoStorage>.Instance);
        // The port may open before the storage answers.
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await _storage.EnsureBucket(Ct);
                return;
            }
            catch (Exception) when (attempt < 30)
            {
                await Task.Delay(500, Ct);
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        _storage.Dispose();
        await _rustfs.DisposeAsync();
        if (Directory.Exists(_directory)) Directory.Delete(_directory, recursive: true);
    }

    private async Task<string> FileWith(byte[] content)
    {
        Directory.CreateDirectory(_directory);
        var path = Path.Combine(_directory, Guid.NewGuid().ToString("N"));
        await File.WriteAllBytesAsync(path, content, Ct);
        return path;
    }

    private async Task<VideoId> Prepared(byte[] video, byte[] poster)
    {
        var id = new VideoId(Guid.CreateVersion7());
        var files = new PreparedVideoFiles(await FileWith(video), await FileWith(poster),
            new PreparedVideo(new VideoDimensions(720, 1280), VideoDuration.FromMilliseconds(12_000)), () => ValueTask.CompletedTask);
        await _storage.StorePrepared(id, files, Ct);
        return id;
    }

    private static async Task<byte[]> Read(VideoContent content)
    {
        await using var stream = content.Content!;
        using var memory = new MemoryStream();
        await stream.CopyToAsync(memory, Ct);
        return memory.ToArray();
    }

    [Fact]
    public async Task FetchOriginal_Should_GiveALocalCopyOfTheOriginal_When_ItWasStored()
    {
        var id = new VideoId(Guid.CreateVersion7());
        await _storage.StoreOriginal(id, await FileWith([1, 2, 3, 4]), Ct);

        string path;
        await using (var original = (await _storage.FetchOriginal(id, Ct)).ShouldNotBeNull())
        {
            (await File.ReadAllBytesAsync(original.Path, Ct)).ShouldBe([1, 2, 3, 4]);
            path = original.Path;
        }

        File.Exists(path).ShouldBeFalse();
    }

    [Fact]
    public async Task DeleteOriginal_Should_LeaveNoOriginal_When_ThePreparationIsOver()
    {
        var id = new VideoId(Guid.CreateVersion7());
        await _storage.StoreOriginal(id, await FileWith([1]), Ct);

        await _storage.DeleteOriginal(id, Ct);

        (await _storage.FetchOriginal(id, Ct)).ShouldBeNull();
    }

    [Fact]
    public async Task Open_Should_GiveTheWholeFile_When_NoRangeIsAsked()
    {
        var id = await Prepared([1, 2, 3, 4, 5], [9]);

        var video = (await _storage.Open(id, VideoRendition.Video, null, Ct)).ShouldNotBeNull();
        video.TotalLength.ShouldBe(5);
        video.Range.ShouldBeNull();
        (await Read(video)).ShouldBe([1, 2, 3, 4, 5]);
        (await Read((await _storage.Open(id, VideoRendition.Poster, null, Ct))!)).ShouldBe([9]);
    }

    [Theory]
    [InlineData(0L, 1L, 0L, 1L, new byte[] { 1, 2 })]
    [InlineData(3L, null, 3L, 4L, new byte[] { 4, 5 })]
    [InlineData(null, 2L, 3L, 4L, new byte[] { 4, 5 })]
    [InlineData(2L, 99L, 2L, 4L, new byte[] { 3, 4, 5 })]
    public async Task Open_Should_ReadOnlyTheAskedRange_When_ARangeIsAsked(long? from, long? to, long first, long last, byte[] expected)
    {
        var id = await Prepared([1, 2, 3, 4, 5], [9]);

        var part = (await _storage.Open(id, VideoRendition.Video, new ByteRange(from, to), Ct)).ShouldNotBeNull();

        part.TotalLength.ShouldBe(5);
        part.Range.ShouldBe((first, last));
        (await Read(part)).ShouldBe(expected);
    }

    [Fact]
    public async Task Open_Should_SayTheRangeIsNotSatisfiable_When_ItIsOutsideTheFile()
    {
        var id = await Prepared([1, 2, 3, 4, 5], [9]);

        var part = (await _storage.Open(id, VideoRendition.Video, new ByteRange(10, null), Ct)).ShouldNotBeNull();

        part.IsRangeNotSatisfiable.ShouldBeTrue();
        part.TotalLength.ShouldBe(5);
    }

    [Fact]
    public async Task Delete_Should_LeaveNoFileOfTheVideo_When_ItIsRemoved()
    {
        var id = await Prepared([1, 2], [9]);
        await _storage.StoreOriginal(id, await FileWith([7]), Ct);

        await _storage.Delete(id, Ct);

        (await _storage.Open(id, VideoRendition.Video, null, Ct)).ShouldBeNull();
        (await _storage.Open(id, VideoRendition.Poster, null, Ct)).ShouldBeNull();
        (await _storage.FetchOriginal(id, Ct)).ShouldBeNull();
    }
}
