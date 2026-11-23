using System.Text;
using AcroFunJam.Api.Endpoints.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.AspNetCore.Http;

namespace AcroFunJam.Api.Tests.Catalog;

/// <summary>
/// Reading the form of a photo (story 10, ADR 0039): a body that is not a form has no file; only a body over the limit is
/// « too large »; a malformed form is not mistaken for a heavy one.
/// </summary>
public sealed class PhotoFormTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static HttpRequest Request(string contentType, byte[] body)
    {
        var context = new DefaultHttpContext();
        context.Request.ContentType = contentType;
        context.Request.Body = new MemoryStream(body);
        context.Request.ContentLength = body.Length;
        return context.Request;
    }

    [Fact]
    public async Task Read_Should_FailWithFileRequired_When_TheBodyIsNotAForm()
    {
        var form = await PhotoForm.Read(Request("application/json", Encoding.UTF8.GetBytes("{\"altText\":\"Bird\"}")), Ct);

        form.Error.ShouldBe(PhotoContentErrors.FileRequired);
    }

    [Fact]
    public async Task Read_Should_ReadTheFileAndTheTexts_When_TheFormIsComplete()
    {
        const string boundary = "photo-boundary";
        var body = Encoding.UTF8.GetBytes(
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"altText\"\r\n\r\nBird vue de profil\r\n" +
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"credit\"\r\n\r\nLéa Martin\r\n" +
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"rightsConfirmed\"\r\n\r\ntrue\r\n" +
            $"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"bird.jpg\"\r\nContent-Type: image/jpeg\r\n\r\nJPEG\r\n" +
            $"--{boundary}--\r\n");

        var form = (await PhotoForm.Read(Request($"multipart/form-data; boundary={boundary}", body), Ct)).Value!;

        form.AltText.ShouldBe("Bird vue de profil");
        form.Credit.ShouldBe("Léa Martin");
        form.RightsConfirmed.ShouldBeTrue();
        Encoding.ASCII.GetString(form.Content.Span).ShouldBe("JPEG");
    }

    [Fact]
    public async Task Read_Should_FailWithFileRequired_When_TheFormIsMalformed()
    {
        var form = await PhotoForm.Read(Request("multipart/form-data; boundary=missing", Encoding.UTF8.GetBytes("not a multipart body")), Ct);

        form.Error.ShouldBe(PhotoContentErrors.FileRequired);
    }
}
