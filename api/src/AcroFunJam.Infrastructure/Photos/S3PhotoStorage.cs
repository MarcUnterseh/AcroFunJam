using System.Net;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using Microsoft.Extensions.Logging;

namespace AcroFunJam.Infrastructure.Photos;

/// <summary>Where the generated sizes are stored (section <c>PhotoStorage</c> of the configuration, ADR 0039).</summary>
public sealed class PhotoStorageOptions
{
    public const string Section = "PhotoStorage";

    /// <summary>The address of the object storage compatible with S3 (RustFS in development).</summary>
    public string ServiceUrl { get; set; } = string.Empty;

    public string Bucket { get; set; } = "acrofunjam-photos";

    public string AccessKey { get; set; } = string.Empty;

    public string SecretKey { get; set; } = string.Empty;
}

/// <summary>
/// S3 adapter of <see cref="IPhotoStorage"/> (ADR 0039, RustFS in development and in the tests): a private bucket, keys <c>poses/{photoId}/{size}.webp</c>, without any
/// personal data. A deletion is at best: its failure is logged, never thrown.
/// </summary>
public sealed partial class S3PhotoStorage(PhotoStorageOptions options, ILogger<S3PhotoStorage> logger) : IPhotoStorage, IDisposable
{
    private readonly AmazonS3Client _client = new(
        new BasicAWSCredentials(options.AccessKey, options.SecretKey),
        new AmazonS3Config { ServiceURL = options.ServiceUrl, ForcePathStyle = true, AuthenticationRegion = "us-east-1" });

    private static readonly PhotoRendition[] Renditions = Enum.GetValues<PhotoRendition>();

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

    public async Task Store(PhotoId photo, PhotoRenditions renditions, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(renditions);
        if (!_bucketReady)
        {
            await EnsureBucket(ct);
            _bucketReady = true;
        }

        foreach (var rendition in renditions.All)
        {
            using var content = new MemoryStream(rendition.Content.ToArray());
            await _client.PutObjectAsync(new PutObjectRequest
            {
                BucketName = options.Bucket,
                Key = Key(photo, rendition.Rendition),
                InputStream = content,
                ContentType = "image/webp",
            }, ct);
        }
    }

    public async Task<Stream?> Open(PhotoId photo, PhotoRendition rendition, CancellationToken ct)
    {
        try
        {
            using var response = await _client.GetObjectAsync(options.Bucket, Key(photo, rendition), ct);
            var content = new MemoryStream();
            await response.ResponseStream.CopyToAsync(content, ct);
            content.Position = 0;
            return content;
        }
        catch (AmazonS3Exception e) when (e.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task Delete(PhotoId photo, CancellationToken ct)
    {
        try
        {
            await _client.DeleteObjectsAsync(new DeleteObjectsRequest
            {
                BucketName = options.Bucket,
                Objects = [.. Renditions.Select(r => new KeyVersion { Key = Key(photo, r) })],
            }, ct);
        }
#pragma warning disable CA1031 // At best, as the port promises: the removal is already saved, a failure here never undoes it.
        catch (Exception e) when (e is not OperationCanceledException)
#pragma warning restore CA1031
        {
            // The photo is already removed from the catalog: its sizes become orphans, swept later (ADR 0039).
            LogDeletionFailed(logger, photo.Value, e);
        }
    }

    public void Dispose() => _client.Dispose();

    private static string Key(PhotoId photo, PhotoRendition rendition) =>
        $"poses/{photo.Value}/{rendition.ToString().ToLowerInvariant()}.webp";

    [LoggerMessage(Level = LogLevel.Warning, Message = "The sizes of the removed photo {PhotoId} could not be deleted.")]
    private static partial void LogDeletionFailed(ILogger logger, Guid photoId, Exception exception);
}
