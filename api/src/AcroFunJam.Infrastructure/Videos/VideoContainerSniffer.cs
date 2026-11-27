using System.Text;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.Videos;

/// <summary>
/// Recognises the container of a file from its first bytes, before any call to ffprobe (ADR 0041, Q308): a <c>ftyp</c> box with
/// a brand of MP4 or of QuickTime, or an EBML header whose <c>DocType</c> is <c>webm</c>. A Matroska file, or a HEIF photo, is not a
/// video accepted here; ffprobe then only ever receives one of these formats.
/// </summary>
public static class VideoContainerSniffer
{
    /// <summary>How many bytes are read to recognise a file.</summary>
    public const int HeadLength = 64;

    private static readonly HashSet<string> Mp4Brands = new(StringComparer.Ordinal)
    {
        "isom", "iso2", "iso3", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "M4VH", "M4VP", "dash", "mmp4", "MSNV", "3gp4",
        "3gp5", "3gp6", "3g2a", "f4v ", "hvc1", "hev1", "av01",
    };

    public static VideoFormat? Recognise(ReadOnlySpan<byte> head)
    {
        if (head.Length >= 12 && head[4..8].SequenceEqual("ftyp"u8))
        {
            var brand = Encoding.ASCII.GetString(head[8..12]);
            if (brand == "qt  ") return VideoFormat.QuickTime;
            return Mp4Brands.Contains(brand) ? VideoFormat.Mp4 : null;
        }

        if (head.Length >= 4 && head[..4].SequenceEqual(new byte[] { 0x1A, 0x45, 0xDF, 0xA3 }))
            return DocTypeIsWebM(head) ? VideoFormat.WebM : null;

        return null;
    }

    /// <summary>The <c>DocType</c> element (ID <c>42 82</c>) of the EBML header says <c>webm</c>.</summary>
    private static bool DocTypeIsWebM(ReadOnlySpan<byte> head)
    {
        for (var i = 4; i + 3 < head.Length; i++)
        {
            if (head[i] != 0x42 || head[i + 1] != 0x82) continue;
            var size = head[i + 2] & 0x7F; // a size of one byte (1xxx xxxx), as every DocType is written
            if ((head[i + 2] & 0x80) == 0 || i + 3 + size > head.Length) return false;
            return head.Slice(i + 3, size).SequenceEqual("webm"u8);
        }

        return false;
    }

    /// <summary>The format of a file on the local disk, from its first bytes.</summary>
    public static async Task<VideoFormat?> Recognise(string path, CancellationToken ct)
    {
        await using var file = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, useAsync: true);
        var head = new byte[HeadLength];
        var read = await file.ReadAtLeastAsync(head, HeadLength, throwOnEndOfStream: false, ct);
        return Recognise(head.AsSpan(0, read));
    }

    /// <summary>The demultiplexer ffprobe and ffmpeg are told to use, never guessed (ADR 0041).</summary>
    public static string DemuxerOf(VideoFormat format) => format == VideoFormat.WebM ? "matroska" : "mov";
}
