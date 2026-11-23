using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

/// <summary>
/// The file of a photo, as found by the processing (story 10, R4 to R6): JPEG, PNG, WebP or HEIC, 10 MiB at most, at least
/// 800 pixels on its shorter side once turned upright. The processing only finds; the domain decides.
/// </summary>
public sealed class PhotoFileTests
{
    private static readonly PhotoFileSize TwoMegabytes = PhotoFileSize.Create(2 * 1024 * 1024).Value!;

    [Theory]
    [InlineData(PhotoFormat.Jpeg)]
    [InlineData(PhotoFormat.Png)]
    [InlineData(PhotoFormat.WebP)]
    [InlineData(PhotoFormat.Heic)]
    public void Accept_Should_AcceptTheFile_When_ItsFormatIsAccepted(PhotoFormat format)
    {
        var file = PhotoFile.Accept(format, TwoMegabytes, new PhotoDimensions(1600, 1200));

        file.Value!.Format.ShouldBe(format);
        file.Value.Size.ShouldBe(TwoMegabytes);
        file.Value.Dimensions.ShouldBe(new PhotoDimensions(1600, 1200));
    }

    [Fact]
    public void Accept_Should_FailWithFormatNotAccepted_When_TheFormatIsNotRecognised()
    {
        PhotoFile.Accept(null, TwoMegabytes, new PhotoDimensions(1600, 1200)).Error.ShouldBe(PhotoContentErrors.FormatNotAccepted);
    }

    [Fact]
    public void Accept_Should_FailWithUnreadable_When_TheDimensionsCouldNotBeFound()
    {
        PhotoFile.Accept(PhotoFormat.Jpeg, TwoMegabytes, null).Error.ShouldBe(PhotoContentErrors.Unreadable);
    }

    [Theory]
    [InlineData(1200, 800)]
    [InlineData(800, 1200)]
    [InlineData(6000, 4000)]
    public void Accept_Should_AcceptTheFile_When_ItsShorterSideHasAtLeast800Pixels(int width, int height)
    {
        PhotoFile.Accept(PhotoFormat.Jpeg, TwoMegabytes, new PhotoDimensions(width, height)).IsSuccess.ShouldBeTrue();
    }

    [Theory]
    [InlineData(1200, 799)]
    [InlineData(799, 1200)]
    public void Accept_Should_FailWithTooSmall_When_ItsShorterSideHasLessThan800Pixels(int width, int height)
    {
        PhotoFile.Accept(PhotoFormat.Jpeg, TwoMegabytes, new PhotoDimensions(width, height)).Error.ShouldBe(PhotoContentErrors.TooSmall);
    }

    [Fact]
    public void Create_Should_AcceptTheSize_When_ItIsExactly10MiB()
    {
        PhotoFileSize.MaxBytes.ShouldBe(10 * 1024 * 1024);
        PhotoFileSize.Create(PhotoFileSize.MaxBytes).Value!.Bytes.ShouldBe(PhotoFileSize.MaxBytes);
    }

    [Fact]
    public void Create_Should_FailWithTooLarge_When_TheSizeExceeds10MiB()
    {
        PhotoFileSize.Create(PhotoFileSize.MaxBytes + 1).Error.ShouldBe(PhotoContentErrors.TooLarge);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_Should_FailWithFileRequired_When_ThereIsNoByte(long bytes)
    {
        PhotoFileSize.Create(bytes).Error.ShouldBe(PhotoContentErrors.FileRequired);
    }
}
