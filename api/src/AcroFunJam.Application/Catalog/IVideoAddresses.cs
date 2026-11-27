using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>Port (ADR 0041): the addresses the site loads a prepared video and its poster from.</summary>
public interface IVideoAddresses
{
    VideoSources Of(VideoId video);
}

/// <summary>The addresses of a prepared video and of its poster.</summary>
public sealed record VideoSources(string Video, string Poster);
