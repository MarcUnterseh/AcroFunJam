using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Infrastructure.Photos;
using Microsoft.Extensions.Logging.Abstractions;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;

namespace AcroFunJam.Infrastructure.Tests.Photos;

/// <summary>
/// The storage of the generated sizes in an object storage compatible with S3 (story 10, ADR 0039), on RustFS: MinIO no longer
/// publishes its images.
/// </summary>
[Trait("Category", "Integration")]
public sealed class S3PhotoStorageTests : IAsyncLifetime
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

    private S3PhotoStorage _storage = null!;

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
        _storage = new S3PhotoStorage(options, NullLogger<S3PhotoStorage>.Instance);
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
    }

    private static PhotoRenditions Renditions() => new(
    [
        new RenderedPhoto(PhotoRendition.Thumbnail, 192, 192, new byte[] { 1, 2 }),
        new RenderedPhoto(PhotoRendition.Page, 1200, 900, new byte[] { 3, 4, 5 }),
        new RenderedPhoto(PhotoRendition.Enlarged, 2400, 1800, new byte[] { 6 }),
    ]);

    private async Task<byte[]?> Read(PhotoId photo, PhotoRendition rendition)
    {
        await using var content = await _storage.Open(photo, rendition, Ct);
        if (content is null) return null;
        using var memory = new MemoryStream();
        await content.CopyToAsync(memory, Ct);
        return memory.ToArray();
    }

    [Fact]
    public async Task Open_Should_GiveEachStoredSize_When_ThePhotoHasBeenStored()
    {
        var photo = new PhotoId(Guid.NewGuid());

        await _storage.Store(photo, Renditions(), Ct);

        (await Read(photo, PhotoRendition.Thumbnail)).ShouldBe(new byte[] { 1, 2 });
        (await Read(photo, PhotoRendition.Page)).ShouldBe(new byte[] { 3, 4, 5 });
        (await Read(photo, PhotoRendition.Enlarged)).ShouldBe(new byte[] { 6 });
    }

    [Fact]
    public async Task Open_Should_GiveNothing_When_ThePhotoIsNotStored()
    {
        (await Read(new PhotoId(Guid.NewGuid()), PhotoRendition.Page)).ShouldBeNull();
    }

    [Fact]
    public async Task Delete_Should_DeleteEverySize_When_ThePhotoIsStored()
    {
        var photo = new PhotoId(Guid.NewGuid());
        await _storage.Store(photo, Renditions(), Ct);

        await _storage.Delete(photo, Ct);

        (await Read(photo, PhotoRendition.Thumbnail)).ShouldBeNull();
        (await Read(photo, PhotoRendition.Page)).ShouldBeNull();
        (await Read(photo, PhotoRendition.Enlarged)).ShouldBeNull();
    }

    [Fact]
    public async Task Delete_Should_NotThrow_When_ThePhotoIsNotStored()
    {
        await Should.NotThrowAsync(() => _storage.Delete(new PhotoId(Guid.NewGuid()), Ct));
    }

    [Fact]
    public async Task Delete_Should_NotThrow_When_TheStorageCannotBeReached()
    {
        using var unreachable = new S3PhotoStorage(
            new PhotoStorageOptions { ServiceUrl = "http://127.0.0.1:1", Bucket = "acrofunjam-photos", AccessKey = "a", SecretKey = "b" },
            NullLogger<S3PhotoStorage>.Instance);

        await Should.NotThrowAsync(() => unreachable.Delete(new PhotoId(Guid.NewGuid()), Ct));
    }
}
