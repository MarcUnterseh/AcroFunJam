using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.AspNetCore.Http.Features;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>
/// The form of a photo sent in <c>multipart/form-data</c> (story 10, ADR 0039): its file, its alternative text, its credit and
/// the confirmation of the rights.
/// </summary>
internal sealed record PhotoForm(ReadOnlyMemory<byte> Content, string? AltText, string? Credit, bool RightsConfirmed)
{
    /// <summary>10 MiB of file and the margin of the multipart envelope (ADR 0039).</summary>
    public const long RequestLimit = PhotoFileSize.MaxBytes + (1024 * 1024);

    /// <summary>
    /// A body that is not a form, a malformed form or a form without file has no photo (<c>photo.file-required</c>); only a
    /// body or a file over the limit is <c>photo.too-large</c> (413).
    /// </summary>
    public static async Task<Result<PhotoForm>> Read(HttpRequest request, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!request.HasFormContentType) return PhotoContentErrors.FileRequired;

        IFormCollection form;
        try
        {
            form = await request.ReadFormAsync(new FormOptions { MultipartBodyLengthLimit = RequestLimit }, ct);
        }
        catch (BadHttpRequestException e) when (e.StatusCode == StatusCodes.Status413PayloadTooLarge)
        {
            return PhotoContentErrors.TooLarge;
        }
        catch (InvalidDataException e) when (e.Message.Contains("limit", StringComparison.OrdinalIgnoreCase))
        {
            return PhotoContentErrors.TooLarge;
        }
        catch (Exception e) when (e is InvalidDataException or IOException or BadHttpRequestException)
        {
            return PhotoContentErrors.FileRequired;
        }

        var file = form.Files.GetFile("file");
        if (file is null || file.Length == 0) return PhotoContentErrors.FileRequired;
        if (file.Length > PhotoFileSize.MaxBytes) return PhotoContentErrors.TooLarge;

        await using var stream = file.OpenReadStream();
        using var memory = new MemoryStream((int)file.Length);
        await stream.CopyToAsync(memory, ct);
        return Result<PhotoForm>.Success(new PhotoForm(
            memory.ToArray(),
            form["altText"].FirstOrDefault(),
            form["credit"].FirstOrDefault(),
            string.Equals(form["rightsConfirmed"].FirstOrDefault(), "true", StringComparison.OrdinalIgnoreCase)));
    }
}
