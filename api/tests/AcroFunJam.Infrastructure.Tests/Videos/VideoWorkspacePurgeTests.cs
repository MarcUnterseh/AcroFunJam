using AcroFunJam.Infrastructure.Videos;

namespace AcroFunJam.Infrastructure.Tests.Videos;

/// <summary>The local directories of the videos emptied when a host starts (ADR 0041): nothing left by a stopped host piles up.</summary>
public sealed class VideoWorkspacePurgeTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "acrofunjam-tests-" + Guid.NewGuid());

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }

    [Fact]
    public async Task StartAsync_Should_EmptyTheDirectoriesOfTheSendingsAndOfThePreparations_When_AHostStarts()
    {
        var options = new VideoProcessingOptions { UploadDirectory = Path.Combine(_root, "uploads"), WorkDirectory = Path.Combine(_root, "videos") };
        Directory.CreateDirectory(Path.Combine(options.UploadDirectory, "left"));
        await File.WriteAllTextAsync(Path.Combine(options.UploadDirectory, "left", "sent"), "x", TestContext.Current.CancellationToken);
        Directory.CreateDirectory(options.WorkDirectory);
        await File.WriteAllTextAsync(Path.Combine(options.WorkDirectory, "prepared.mp4"), "x", TestContext.Current.CancellationToken);

        await new VideoWorkspacePurge(options).StartAsync(TestContext.Current.CancellationToken);

        Directory.EnumerateFileSystemEntries(options.UploadDirectory).ShouldBeEmpty();
        Directory.EnumerateFileSystemEntries(options.WorkDirectory).ShouldBeEmpty();
    }

    [Fact]
    public async Task StartAsync_Should_CreateTheDirectories_When_TheyDoNotExistYet()
    {
        var options = new VideoProcessingOptions { UploadDirectory = Path.Combine(_root, "uploads"), WorkDirectory = Path.Combine(_root, "videos") };

        await new VideoWorkspacePurge(options).StartAsync(TestContext.Current.CancellationToken);

        Directory.Exists(options.UploadDirectory).ShouldBeTrue();
        Directory.Exists(options.WorkDirectory).ShouldBeTrue();
    }
}
