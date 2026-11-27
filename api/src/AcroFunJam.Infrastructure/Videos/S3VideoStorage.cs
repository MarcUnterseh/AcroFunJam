using System.Globalization;
using System.Net;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Infrastructure.Photos;
using Microsoft.Extensions.Logging;
using ByteRange = AcroFunJam.Application.Catalog.ByteRange;

namespace AcroFunJam.Infrastructure.Videos;

/// <summary>
/// S3 adapter of <see cref="IVideoStorage"/> (ADR 0041): the bucket of the photos (Cloudflare R2 in production, RustFS in
/// development and in the tests), keys <c>originals/{videoId}</c> (private prefix, deleted after the preparation, and by a rule of
/// the life cycle of the bucket after 2 days), <c>transitions/{videoId}/video.mp4</c> and <c>transitions/{videoId}/poster.webp</c>.
/// A read is partial when a range is asked. A deletion is at best: its failure is logged, never thrown.
/// </summary>
public sealed partial class S3VideoStorage(PhotoStorageOptions options, VideoProcessingOptions processing, ILogger<S3VideoStorage> logger)
    : IVideoStorage, IDisposable
{
    private readonly AmazonS3Client _client = new(
        new BasicAWSCredentials(options.AccessKey, options.SecretKey),
        new AmazonS3Config
        {
            ServiceURL = options.ServiceUrl,
            ForcePathStyle = true,
            AuthenticationRegion = "us-east-1",
            // Cloudflare R2 (ADR 0040) rejects the trailing checksums the SDK adds by default.
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
        });

    private volatile bool _bucketReady;

    /// <summary>Creates the bucket when it does not exist (development and tests).</summary>
    public async Task EnsureBucket(CancellationToken ct)
    {
        try
        {
            await _client.PutBucketAsync(new PutBucketRequest { BucketName = options.Bucket }, ct);
        }
        catch (AmazonS3Exception e) when (e.ErrorCode is "BucketAlreadyOwnedByYou" or "BucketAlreadyExists")
        {
        }
    }

    public Task StoreOriginal(VideoId video, string path, CancellationToken ct) => Put(OriginalKey(video), path, "application/octet-stream", ct);

    public async Task<TemporaryVideoFile?> FetchOriginal(VideoId video, CancellationToken ct)
    {
        Directory.CreateDirectory(processing.WorkDirectory);
        var path = Path.Combine(processing.WorkDirectory, $"{video.Value:N}-original");
        try
        {
            using var response = await _client.GetObjectAsync(options.Bucket, OriginalKey(video), ct);
            await using var file = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true);
            await response.ResponseStream.CopyToAsync(file, ct);
        }
        catch (AmazonS3Exception e) when (e.StatusCode == HttpStatusCode.NotFound)
        {
            File.Delete(path);
            return null;
        }
        catch
        {
            File.Delete(path);
            throw;
        }

        return new TemporaryVideoFile(path, () =>
        {
            File.Delete(path);
            return ValueTask.CompletedTask;
        });
    }

    public async Task StorePrepared(VideoId video, PreparedVideoFiles files, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(files);
        await Put(Key(video, VideoRendition.Video), files.VideoPath, "video/mp4", ct);
        await Put(Key(video, VideoRendition.Poster), files.PosterPath, "image/webp", ct);
    }

    public async Task<VideoContent?> Open(VideoId video, VideoRendition rendition, ByteRange? range, CancellationToken ct)
    {
        var request = new GetObjectRequest { BucketName = options.Bucket, Key = Key(video, rendition) };
        if (range is not null) request.ByteRange = new Amazon.S3.Model.ByteRange(HeaderOf(range));

        GetObjectResponse response;
        try
        {
            response = await _client.GetObjectAsync(request, ct);
        }
        catch (AmazonS3Exception e) when (e.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
        catch (AmazonS3Exception e) when (e.StatusCode == HttpStatusCode.RequestedRangeNotSatisfiable)
        {
            var metadata = await _client.GetObjectMetadataAsync(options.Bucket, Key(video, rendition), ct);
            return VideoContent.RangeNotSatisfiable(metadata.ContentLength);
        }

        var content = new ResponseStream(response);
        if (range is null || ContentRangeOf(response.ContentRange) is not { } served)
            return new VideoContent(content, response.ContentLength, null);
        return new VideoContent(content, served.Total, (served.First, served.Last));
    }

    public Task DeleteOriginal(VideoId video, CancellationToken ct) => DeleteKeys(video, [OriginalKey(video)], ct);

    public Task Delete(VideoId video, CancellationToken ct) =>
        DeleteKeys(video, [OriginalKey(video), Key(video, VideoRendition.Video), Key(video, VideoRendition.Poster)], ct);

    public void Dispose() => _client.Dispose();

    private async Task Put(string key, string path, string contentType, CancellationToken ct)
    {
        if (options.CreateBucket && !_bucketReady)
        {
            await EnsureBucket(ct);
            _bucketReady = true;
        }

        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = options.Bucket,
            Key = key,
            FilePath = path,
            ContentType = contentType,
            // In one signed piece: R2 does not take every streamed sending (100 MiB at most, ADR 0041).
            UseChunkEncoding = false,
        }, ct);
    }

    private async Task DeleteKeys(VideoId video, string[] keys, CancellationToken ct)
    {
        try
        {
            await _client.DeleteObjectsAsync(new DeleteObjectsRequest
            {
                BucketName = options.Bucket,
                Objects = [.. keys.Select(k => new KeyVersion { Key = k })],
            }, ct);
        }
#pragma warning disable CA1031 // At best, as the port promises: the removal is already saved, a failure here never undoes it.
        catch (Exception e) when (e is not OperationCanceledException)
#pragma warning restore CA1031
        {
            // Orphans, swept later (ADR 0041); an original also expires by the life cycle of the bucket.
            LogDeletionFailed(logger, video.Value, e);
        }
    }

    private static string OriginalKey(VideoId video) => $"originals/{video.Value}";

    private static string Key(VideoId video, VideoRendition rendition) =>
        rendition == VideoRendition.Video ? $"transitions/{video.Value}/video.mp4" : $"transitions/{video.Value}/poster.webp";

    private static string HeaderOf(ByteRange range) =>
        range.From is { } from
            ? $"bytes={from.ToString(CultureInfo.InvariantCulture)}-{range.To?.ToString(CultureInfo.InvariantCulture)}"
            : $"bytes=-{range.To!.Value.ToString(CultureInfo.InvariantCulture)}";

    /// <summary>« bytes 0-1/1234 », the range a partial read served and the total length.</summary>
    private static (long First, long Last, long Total)? ContentRangeOf(string? header)
    {
        if (header is null || !header.StartsWith("bytes ", StringComparison.OrdinalIgnoreCase)) return null;
        var parts = header[6..].Split('/', '-');
        return parts.Length == 3 &&
               long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var first) &&
               long.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var last) &&
               long.TryParse(parts[2], NumberStyles.None, CultureInfo.InvariantCulture, out var total)
            ? (first, last, total)
            : null;
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "The files of the video {VideoId} could not be deleted.")]
    private static partial void LogDeletionFailed(ILogger logger, Guid videoId, Exception exception);

    /// <summary>The content of a read, streamed as it comes from the storage; the response is released with it.</summary>
    private sealed class ResponseStream(GetObjectResponse response) : Stream
    {
        private readonly Stream _inner = response.ResponseStream;

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();

        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override int Read(byte[] buffer, int offset, int count) => _inner.Read(buffer, offset, count);

        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
            _inner.ReadAsync(buffer, cancellationToken);

        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) =>
            _inner.ReadAsync(buffer, offset, count, cancellationToken);

        public override void Flush()
        {
        }

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing) response.Dispose();
            base.Dispose(disposing);
        }
    }
}
