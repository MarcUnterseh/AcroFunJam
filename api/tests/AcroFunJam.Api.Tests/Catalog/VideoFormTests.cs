using System.Text;
using AcroFunJam.Api.Endpoints.Catalog;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.AspNetCore.Http;

namespace AcroFunJam.Api.Tests.Catalog;

/// <summary>
/// Reading the form of a video (story 12, ADR 0041): the texts, then the file streamed to a temporary file, never held in memory,
/// stopped beyond 100 MiB; the temporary file is deleted with the form. And the single range a <c>Range</c> header asks.
/// </summary>
public sealed class VideoFormTests : IDisposable
{
    private const string Boundary = "video-boundary";
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly string _directory = Path.Combine(Path.GetTempPath(), "acrofunjam-tests-" + Guid.NewGuid());

    public void Dispose()
    {
        if (Directory.Exists(_directory)) Directory.Delete(_directory, recursive: true);
    }

    private static HttpRequest Request(string contentType, Stream body)
    {
        var context = new DefaultHttpContext();
        context.Request.ContentType = contentType;
        context.Request.Body = body;
        return context.Request;
    }

    private static string Text(string name, string value) =>
        $"--{Boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n";

    private static MemoryStream Body(string texts, byte[]? file)
    {
        var body = new MemoryStream();
        body.Write(Encoding.UTF8.GetBytes(texts));
        if (file is not null)
        {
            body.Write(Encoding.UTF8.GetBytes($"--{Boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"pop.mp4\"\r\nContent-Type: video/mp4\r\n\r\n"));
            body.Write(file);
            body.Write("\r\n"u8);
        }

        body.Write(Encoding.UTF8.GetBytes($"--{Boundary}--\r\n"));
        body.Position = 0;
        return body;
    }

    [Fact]
    public async Task Read_Should_ReadTheTextsAndStreamTheFileToATemporaryFile_When_TheFormIsComplete()
    {
        var texts = Text("caption", "Pop to Bird, vue de côté") + Text("credit", "Léa Martin") + Text("description", "La base pousse.") +
                    Text("rightsConfirmed", "true");

        string path;
        await using (var form = (await VideoForm.Read(Request($"multipart/form-data; boundary={Boundary}", Body(texts, "MP4 content"u8.ToArray())), _directory, Ct)).Value!)
        {
            form.Caption.ShouldBe("Pop to Bird, vue de côté");
            form.Credit.ShouldBe("Léa Martin");
            form.Description.ShouldBe("La base pousse.");
            form.RightsConfirmed.ShouldBeTrue();
            var upload = form.File.ShouldNotBeNull();
            upload.Length.ShouldBe(11);
            Path.GetDirectoryName(upload.Path).ShouldBe(_directory);
            (await File.ReadAllTextAsync(upload.Path, Ct)).ShouldBe("MP4 content");
            path = upload.Path;
        }

        File.Exists(path).ShouldBeFalse();
    }

    [Fact]
    public async Task Read_Should_GiveNoFile_When_TheFormHasNone()
    {
        await using var form = (await VideoForm.Read(
            Request($"multipart/form-data; boundary={Boundary}", Body(Text("caption", "Vue"), null)), _directory, Ct)).Value!;

        form.File.ShouldBeNull();
        form.RightsConfirmed.ShouldBeFalse();
    }

    [Fact]
    public async Task Read_Should_FailWithFileRequired_When_TheBodyIsNotAForm()
    {
        (await VideoForm.Read(Request("application/json", new MemoryStream("{}"u8.ToArray())), _directory, Ct)).Error
            .ShouldBe(VideoContentErrors.FileRequired);
    }

    [Fact]
    public async Task Read_Should_FailWithTooLargeAndLeaveNoFile_When_TheFileWeighsMoreThanTheLimit()
    {
        VideoForm.MaxFileBytes.ShouldBe(VideoFileSize.MaxBytes);
        var file = new byte[11];

        (await VideoForm.Read(Request($"multipart/form-data; boundary={Boundary}", Body(Text("caption", "Vue"), file)), _directory, Ct, maxFileBytes: 10)).Error
            .ShouldBe(VideoContentErrors.TooLarge);
        (Directory.Exists(_directory) ? Directory.GetFiles(_directory) : []).ShouldBeEmpty();
    }

    [Fact]
    public async Task Read_Should_KeepOnlyTheTextsOfTheForm_When_OtherPartsAreSent()
    {
        var texts = Text("caption", "Vue de face") + string.Concat(Enumerable.Range(0, 50).Select(n => Text($"other{n}", new string('x', 4000))));

        await using var form = (await VideoForm.Read(Request($"multipart/form-data; boundary={Boundary}", Body(texts, null)), _directory, Ct)).Value!;

        form.Caption.ShouldBe("Vue de face");
        form.KeptTexts.ShouldBe(["caption"]);
    }

    [Theory]
    [InlineData("bytes=0-1", 0L, 1L)]
    [InlineData("bytes=100-", 100L, null)]
    [InlineData("bytes=-500", null, 500L)]
    [InlineData(" bytes = 5 - 9 ", 5L, 9L)]
    public void RangeOf_Should_GiveTheSingleRange_When_TheHeaderAsksOne(string header, long? from, long? to)
    {
        VideoRanges.RangeOf(header).ShouldBe(new ByteRange(from, to));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("bytes=0-1,5-9")]
    [InlineData("items=0-1")]
    [InlineData("bytes=a-b")]
    [InlineData("bytes=-")]
    [InlineData("bytes=5-4")]
    public void RangeOf_Should_GiveNoRange_When_TheHeaderAsksNoneOrSeveralOrIsNotUnderstood(string? header)
    {
        VideoRanges.RangeOf(header).ShouldBeNull();
    }
}
