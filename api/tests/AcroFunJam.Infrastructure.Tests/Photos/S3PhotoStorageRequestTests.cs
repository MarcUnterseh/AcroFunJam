using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using System.Text;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Infrastructure.Photos;
using Microsoft.Extensions.Logging.Abstractions;

namespace AcroFunJam.Infrastructure.Tests.Photos;

/// <summary>
/// The requests the storage sends, seen by a fake S3 endpoint: Cloudflare R2, the storage of production (ADR 0040), rejects the
/// streamed sending with a trailing checksum that the AWS SDK uses by default ("STREAMING-AWS4-HMAC-SHA256-PAYLOAD-TRAILER not
/// implemented").
/// </summary>
public sealed class S3PhotoStorageRequestTests : IAsyncDisposable
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly RecordingS3Endpoint _endpoint = new();

    public async ValueTask DisposeAsync() => await _endpoint.DisposeAsync();

    [Fact]
    public async Task Store_Should_SendEachSizeInOnePiece_When_SendingToTheStorage()
    {
        using var storage = new S3PhotoStorage(
            new PhotoStorageOptions
            {
                ServiceUrl = _endpoint.Url,
                Bucket = "acrofunjam-photos",
                AccessKey = "a",
                SecretKey = "b",
                CreateBucket = false,
            },
            NullLogger<S3PhotoStorage>.Instance);

        await storage.Store(
            new PhotoId(Guid.NewGuid()),
            new PhotoRenditions(
            [
                new RenderedPhoto(PhotoRendition.Thumbnail, 192, 192, new byte[] { 1, 2 }),
                new RenderedPhoto(PhotoRendition.Page, 1200, 900, new byte[] { 3, 4, 5 }),
                new RenderedPhoto(PhotoRendition.Enlarged, 2400, 1800, new byte[] { 6 }),
            ]),
            Ct);

        var puts = _endpoint.Requests.Where(r => r.Method == "PUT").ToList();
        puts.Count.ShouldBe(3);
        foreach (var put in puts)
        {
            put.Header("x-amz-content-sha256").ShouldNotStartWith("STREAMING-");
            (put.Header("content-encoding") ?? string.Empty).ShouldNotContain("aws-chunked");
            put.Header("x-amz-trailer").ShouldBeNull();
        }
    }

    private sealed record RecordedRequest(string Method, IReadOnlyDictionary<string, string> Headers)
    {
        public string? Header(string name) => Headers.TryGetValue(name, out var value) ? value : null;
    }

    /// <summary>A minimal HTTP endpoint that records each request and answers 200, as S3 does to a sending.</summary>
    private sealed class RecordingS3Endpoint : IAsyncDisposable
    {
        private readonly TcpListener _listener = new(IPAddress.Loopback, 0);
        private readonly CancellationTokenSource _stop = new();
        private readonly Task _serving;

        public RecordingS3Endpoint()
        {
            _listener.Start();
            _serving = Serve();
        }

        public ConcurrentQueue<RecordedRequest> Requests { get; } = new();

        public string Url => $"http://127.0.0.1:{((IPEndPoint)_listener.LocalEndpoint).Port}";

        public async ValueTask DisposeAsync()
        {
            await _stop.CancelAsync();
            _listener.Stop();
            try
            {
                await _serving;
            }
            catch (OperationCanceledException)
            {
            }
            _stop.Dispose();
        }

        private async Task Serve()
        {
            while (!_stop.IsCancellationRequested)
            {
                using var client = await _listener.AcceptTcpClientAsync(_stop.Token);
                await using var stream = client.GetStream();
                while (await ReadRequest(stream) is { } request)
                {
                    Requests.Enqueue(request);
                    var answer = Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nETag: \"etag\"\r\nContent-Length: 0\r\n\r\n");
                    await stream.WriteAsync(answer, _stop.Token);
                }
            }
        }

        private async Task<RecordedRequest?> ReadRequest(NetworkStream stream)
        {
            var head = new StringBuilder();
            var one = new byte[1];
            while (!head.ToString().EndsWith("\r\n\r\n", StringComparison.Ordinal))
            {
                if (await stream.ReadAsync(one, _stop.Token) == 0) return null;
                head.Append((char)one[0]);
            }

            var lines = head.ToString().Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
            var headers = lines.Skip(1)
                .Select(line => line.Split(':', 2))
                .ToDictionary(parts => parts[0].Trim().ToLowerInvariant(), parts => parts[1].Trim());
            if (headers.TryGetValue("content-length", out var length))
            {
                var body = new byte[int.Parse(length, System.Globalization.CultureInfo.InvariantCulture)];
                await stream.ReadExactlyAsync(body, _stop.Token);
            }

            return new RecordedRequest(lines[0].Split(' ')[0], headers);
        }
    }
}
