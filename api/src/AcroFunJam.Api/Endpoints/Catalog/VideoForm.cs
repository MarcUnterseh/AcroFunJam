using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.AddTransitionVideo;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Net.Http.Headers;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>
/// The form of a video sent in <c>multipart/form-data</c> (story 12, ADR 0041): its caption, credit, description and confirmation
/// of the rights (any other part skipped), then its file, read by <see cref="MultipartReader"/> and streamed to a temporary file, never held in memory,
/// stopped beyond 100 MiB. Disposing the form deletes the temporary file.
/// </summary>
internal sealed class VideoForm : IAsyncDisposable
{
    /// <summary>100 MiB of file (ADR 0041).</summary>
    public const long MaxFileBytes = VideoFileSize.MaxBytes;

    /// <summary>The file and the margin of the multipart envelope: the limit of the body of this endpoint only (ADR 0041).</summary>
    public const long RequestLimit = MaxFileBytes + (1024 * 1024);

    /// <summary>A text part longer than this is not a text of the form: it is cut (the domain then refuses it as too long).</summary>
    private const int MaxTextChars = 4096;

    /// <summary>The texts of the form: any other part is skipped unread, never kept.</summary>
    private static readonly HashSet<string> TextNames = new(StringComparer.Ordinal) { "caption", "credit", "description", "rightsConfirmed" };

    private readonly Dictionary<string, string> _texts;

    private VideoForm(Dictionary<string, string> texts, VideoUpload? file)
    {
        _texts = texts;
        File = file;
    }

    public string? Caption => _texts.GetValueOrDefault("caption");

    public string? Credit => _texts.GetValueOrDefault("credit");

    public string? Description => _texts.GetValueOrDefault("description");

    /// <summary>The names of the texts kept.</summary>
    internal IReadOnlyCollection<string> KeptTexts => _texts.Keys;

    public bool RightsConfirmed => string.Equals(_texts.GetValueOrDefault("rightsConfirmed"), "true", StringComparison.OrdinalIgnoreCase);

    /// <summary>The temporary file of the video and its weight; none when the form has no file.</summary>
    public VideoUpload? File { get; }

    /// <summary>
    /// A body that is not a form, or a malformed form, has no video (<c>video.file-required</c>); a file over the limit, or a body
    /// over the limit of the endpoint, is <c>video.too-large</c> (413).
    /// </summary>
    public static async Task<Result<VideoForm>> Read(HttpRequest request, string directory, CancellationToken ct, long maxFileBytes = MaxFileBytes)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!request.HasFormContentType || !MediaTypeHeaderValue.TryParse(request.ContentType, out var mediaType) ||
            HeaderUtilities.RemoveQuotes(mediaType.Boundary).Value is not { Length: > 0 } boundary)
            return VideoContentErrors.FileRequired;

        var texts = new Dictionary<string, string>(StringComparer.Ordinal);
        VideoUpload? file = null;
        try
        {
            var reader = new MultipartReader(boundary, request.Body) { BodyLengthLimit = null };
            while (await reader.ReadNextSectionAsync(ct) is { } section)
            {
                if (!ContentDispositionHeaderValue.TryParse(section.ContentDisposition, out var disposition)) continue;
                var name = HeaderUtilities.RemoveQuotes(disposition.Name).Value;
                if (disposition.IsFileDisposition() && name == "file" && file is null)
                {
                    file = await StreamToFile(section.Body, directory, maxFileBytes, ct);
                    if (file is null) return VideoContentErrors.TooLarge;
                }
                else if (disposition.IsFormDisposition() && name is not null && TextNames.Contains(name))
                {
                    texts[name] = await TextOf(section.Body, ct);
                }
            }
        }
        catch (BadHttpRequestException e) when (e.StatusCode == StatusCodes.Status413PayloadTooLarge)
        {
            await Delete(file);
            return VideoContentErrors.TooLarge;
        }
        catch (Exception e) when (e is InvalidDataException or IOException or BadHttpRequestException)
        {
            await Delete(file);
            return VideoContentErrors.FileRequired;
        }
        catch
        {
            await Delete(file);
            throw;
        }

        return Result<VideoForm>.Success(new VideoForm(texts, file));
    }

    public ValueTask DisposeAsync() => Delete(File);

    /// <summary>Copies the file to a new temporary file; none (and no file left) beyond the limit.</summary>
    private static async Task<VideoUpload?> StreamToFile(Stream body, string directory, long maxFileBytes, CancellationToken ct)
    {
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, Guid.NewGuid().ToString("N"));
        long length = 0;
        try
        {
            await using var target = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
            var buffer = new byte[81920];
            int read;
            while ((read = await body.ReadAsync(buffer, ct)) > 0)
            {
                length += read;
                if (length > maxFileBytes) break;
                await target.WriteAsync(buffer.AsMemory(0, read), ct);
            }
        }
        catch
        {
            System.IO.File.Delete(path);
            throw;
        }

        if (length <= maxFileBytes) return new VideoUpload(path, length);
        System.IO.File.Delete(path);
        return null;
    }

    private static async Task<string> TextOf(Stream body, CancellationToken ct)
    {
        using var reader = new StreamReader(body);
        var buffer = new char[MaxTextChars];
        var read = await reader.ReadBlockAsync(buffer, ct);
        return new string(buffer, 0, read);
    }

    private static ValueTask Delete(VideoUpload? file)
    {
        if (file is not null) System.IO.File.Delete(file.Path);
        return ValueTask.CompletedTask;
    }
}

/// <summary>
/// The single range of bytes a <c>Range</c> header asks (ADR 0041); several ranges, or none understood, give the whole file. A
/// range whose last byte comes before its first is invalid: the header is ignored (RFC 9110, section 14.1.1).
/// </summary>
internal static class VideoRanges
{
    public static ByteRange? RangeOf(string? header)
    {
        if (string.IsNullOrWhiteSpace(header)) return null;
        var parts = header.Split('=', 2);
        if (parts.Length != 2 || !string.Equals(parts[0].Trim(), "bytes", StringComparison.OrdinalIgnoreCase)) return null;
        var spec = parts[1].Trim();
        if (spec.Contains(',', StringComparison.Ordinal)) return null;

        var bounds = spec.Split('-', 2);
        if (bounds.Length != 2) return null;
        var from = Number(bounds[0]);
        var to = Number(bounds[1]);
        if (from is null && to is null) return null;
        if ((bounds[0].Trim().Length > 0 && from is null) || (bounds[1].Trim().Length > 0 && to is null)) return null;
        if (from is { } first && to is { } last && last < first) return null;
        return new ByteRange(from, to);
    }

    private static long? Number(string text) =>
        long.TryParse(text.Trim(), System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out var number)
            ? number
            : null;
}
