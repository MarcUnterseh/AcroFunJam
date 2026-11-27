using AcroFunJam.Infrastructure.Videos;
using AcroFunJam.TestSupport;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace AcroFunJam.Api.Tests.Catalog;

/// <summary>
/// The temporary files of the sendings (ADR 0041): the Api empties its directory when it starts, in every environment; each host
/// of the tests has a directory of its own, so that none empties the directory of another.
/// </summary>
public sealed class VideoWorkspaceTests(VideoFileEndpointTests.ApiWithAVideo api) : IClassFixture<VideoFileEndpointTests.ApiWithAVideo>
{
    [Fact]
    public void Api_Should_EmptyItsOwnDirectoryOfTheSendingsAtStart_When_ItIsAHostOfTheTests()
    {
        api.Services.GetServices<IHostedService>().ShouldContain(s => s is VideoWorkspacePurge);
        api.Services.GetRequiredService<VideoProcessingOptions>().UploadDirectory.ShouldStartWith(TestVideoWorkspace.Root);
    }
}
