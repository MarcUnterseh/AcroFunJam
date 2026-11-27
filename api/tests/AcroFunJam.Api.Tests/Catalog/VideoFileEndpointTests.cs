using System.Net;
using System.Net.Http.Headers;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using AcroFunJam.TestSupport;

namespace AcroFunJam.Api.Tests.Catalog;

/// <summary>
/// The prepared files of a video served with partial responses (story 12, Q307, ADR 0041): Safari on the iPhone first asks
/// <c>bytes=0-1</c>. One range gives 206, several ranges the whole file, a range outside the file 416; <c>If-Range</c> is compared
/// to the ETag; a removed video, or one not ready, is not found.
/// </summary>
public sealed class VideoFileEndpointTests(VideoFileEndpointTests.ApiWithAVideo api) : IClassFixture<VideoFileEndpointTests.ApiWithAVideo>
{
    private static readonly VideoId Ready = new(Guid.Parse("e0000000-0000-0000-0000-000000000001"));
    private static readonly byte[] Content = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private async Task<HttpResponseMessage> Get(VideoId video, string file, string? range = null, string? ifRange = null)
    {
        using var client = api.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri($"/catalog/videos/{video.Value}/{file}", UriKind.Relative));
        if (range is not null) request.Headers.TryAddWithoutValidation("Range", range);
        if (ifRange is not null) request.Headers.TryAddWithoutValidation("If-Range", ifRange);
        return await client.SendAsync(request, Ct);
    }

    [Fact]
    public async Task GetVideoFile_Should_ServeTheWholeFileAndAcceptRanges_When_NoRangeIsAsked()
    {
        using var response = await Get(Ready, "video");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.ShouldBe("video/mp4");
        response.Content.Headers.ContentLength.ShouldBe(10);
        response.Headers.AcceptRanges.ShouldBe(["bytes"]);
        response.Headers.CacheControl!.Private.ShouldBeTrue();
        response.Headers.ETag.ShouldNotBeNull();
        (await response.Content.ReadAsByteArrayAsync(Ct)).ShouldBe(Content);
    }

    [Theory]
    [InlineData("bytes=0-1", 0, 1)]
    [InlineData("bytes=8-", 8, 9)]
    [InlineData("bytes=-3", 7, 9)]
    public async Task GetVideoFile_Should_Answer206WithTheRange_When_ASingleRangeIsAsked(string range, int first, int last)
    {
        using var response = await Get(Ready, "video", range);

        response.StatusCode.ShouldBe(HttpStatusCode.PartialContent);
        response.Content.Headers.ContentRange.ShouldBe(new ContentRangeHeaderValue(first, last, 10));
        response.Content.Headers.ContentLength.ShouldBe(last - first + 1);
        (await response.Content.ReadAsByteArrayAsync(Ct)).ShouldBe(Content[first..(last + 1)]);
    }

    [Fact]
    public async Task GetVideoFile_Should_ServeTheWholeFile_When_SeveralRangesAreAsked()
    {
        using var response = await Get(Ready, "video", "bytes=0-1,4-5");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await response.Content.ReadAsByteArrayAsync(Ct)).ShouldBe(Content);
    }

    [Fact]
    public async Task GetVideoFile_Should_Answer416_When_TheRangeIsOutsideTheFile()
    {
        using var response = await Get(Ready, "video", "bytes=20-");

        response.StatusCode.ShouldBe(HttpStatusCode.RequestedRangeNotSatisfiable);
        response.Content.Headers.ContentRange!.ToString().ShouldBe("bytes */10");
    }

    [Fact]
    public async Task GetVideoFile_Should_ServeTheWholeFile_When_IfRangeIsNotItsETag()
    {
        using var first = await Get(Ready, "video");
        var etag = first.Headers.ETag!.ToString();

        using var same = await Get(Ready, "video", "bytes=0-1", etag);
        using var other = await Get(Ready, "video", "bytes=0-1", "\"another\"");

        same.StatusCode.ShouldBe(HttpStatusCode.PartialContent);
        other.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetVideoFile_Should_ServeThePosterAsWebP_When_ThePosterIsAsked()
    {
        using var response = await Get(Ready, "poster");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.ShouldBe("image/webp");
    }

    [Fact]
    public async Task GetVideoFile_Should_Answer404_When_TheVideoIsNotReadyOrTheFileUnknown()
    {
        using var unknown = await Get(new VideoId(Guid.NewGuid()), "video");
        using var otherFile = await Get(Ready, "original");

        unknown.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        otherFile.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    /// <summary>The Api with a single ready video, served from memory, without database.</summary>
    public sealed class ApiWithAVideo : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.UseOwnVideoWorkspace();
            builder.UseSetting("Catalog:SeedInitialTagList", "false");
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<ITransitionVideosRepository>();
                services.AddSingleton<ITransitionVideosRepository, OneReadyVideo>();
                services.RemoveAll<IVideoStorage>();
                services.AddSingleton<IVideoStorage, InMemoryVideoFiles>();
            });
        }
    }

    private sealed class OneReadyVideo : ITransitionVideosRepository
    {
        public Task<TransitionVideos> GetFor(TransitionId transition, CancellationToken ct) => throw new NotSupportedException();

        public Task<IReadOnlyDictionary<TransitionId, TransitionVideos>> GetFor(IReadOnlyCollection<TransitionId> transitions, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<TransitionVideos?> FindByVideo(VideoId video, CancellationToken ct) =>
            Task.FromResult(video == Ready
                ? TransitionVideos.Rehydrate(new TransitionId(Guid.NewGuid()),
                [
                    Video.Rehydrate(Ready, VideoCaption.Create("Vue de face").Value!, VideoCredit.Create("Léa Martin").Value!, null,
                        new VideoDimensions(1280, 720), VideoDuration.FromMilliseconds(12_000), VideoPreparation.Ready,
                        new RightsConfirmation(new CatalogManagerId(Guid.NewGuid()), DateTimeOffset.UnixEpoch), 1, DateTimeOffset.UnixEpoch),
                ])
                : null);

        public void Save(TransitionVideos videos) => throw new NotSupportedException();
    }

    private sealed class InMemoryVideoFiles : IVideoStorage
    {
        public Task<VideoContent?> Open(VideoId video, VideoRendition rendition, ByteRange? range, CancellationToken ct)
        {
            if (range is null) return Task.FromResult<VideoContent?>(new VideoContent(new MemoryStream(Content), Content.Length, null));
            if (range.Within(Content.Length) is not { } within) return Task.FromResult<VideoContent?>(VideoContent.RangeNotSatisfiable(Content.Length));
            return Task.FromResult<VideoContent?>(new VideoContent(new MemoryStream(Content[(int)within.First..((int)within.Last + 1)]), Content.Length, within));
        }

        public Task StoreOriginal(VideoId video, string path, CancellationToken ct) => throw new NotSupportedException();

        public Task<TemporaryVideoFile?> FetchOriginal(VideoId video, CancellationToken ct) => throw new NotSupportedException();

        public Task StorePrepared(VideoId video, PreparedVideoFiles files, CancellationToken ct) => throw new NotSupportedException();

        public Task DeleteOriginal(VideoId video, CancellationToken ct) => throw new NotSupportedException();

        public Task Delete(VideoId video, CancellationToken ct) => throw new NotSupportedException();
    }
}
