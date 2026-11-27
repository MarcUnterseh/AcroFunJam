using Microsoft.AspNetCore.Hosting;

namespace AcroFunJam.TestSupport;

/// <summary>
/// The local directories of the videos of a host of the tests (ADR 0041), its own: the Api empties them when it starts, and the
/// hosts of the tests run side by side. Shared by the test projects that start the Api; the directories of earlier runs, older
/// than a day, are deleted.
/// </summary>
internal static class TestVideoWorkspace
{
    /// <summary>Where the directories of the hosts of the tests are, in the temporary directory.</summary>
    public static readonly string Root = Path.Combine(Path.GetTempPath(), "acrofunjam-test-hosts");

    static TestVideoWorkspace()
    {
        if (!Directory.Exists(Root)) return;
        foreach (var old in new DirectoryInfo(Root).EnumerateDirectories().Where(d => d.CreationTimeUtc < DateTime.UtcNow.AddDays(-1)))
        {
            try
            {
                old.Delete(recursive: true);
            }
            catch (IOException)
            {
                // In use: deleted by a later run.
            }
        }
    }

    /// <summary>Gives this host directories of its own.</summary>
    public static IWebHostBuilder UseOwnVideoWorkspace(this IWebHostBuilder builder)
    {
        var directory = Path.Combine(Root, Guid.NewGuid().ToString("N"));
        return builder
            .UseSetting("VideoProcessing:UploadDirectory", Path.Combine(directory, "uploads"))
            .UseSetting("VideoProcessing:WorkDirectory", Path.Combine(directory, "videos"));
    }
}
