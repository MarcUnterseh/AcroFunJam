using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.GetVideoContent;

/// <summary>
/// A prepared file of a video, or the asked range of it, for anybody (ADR 0041); a removed video, or one not ready, is not found,
/// even by its address (V16).
/// </summary>
public sealed record GetVideoContent(VideoId Video, VideoRendition Rendition, ByteRange? Range);
