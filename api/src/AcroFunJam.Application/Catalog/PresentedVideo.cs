using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog;

/// <summary>
/// A video as presented (story 12, V18, ADR 0041): its caption, credit and description, its presented dimensions (planned while in
/// preparation), its duration, its preparation, and the addresses of the video and of its poster once ready. The confirmation of
/// the rights is never presented.
/// </summary>
public sealed record PresentedVideo(
    VideoId Id, string Caption, string Credit, string? Description, int Width, int Height, long DurationMs, VideoPreparation Preparation,
    VideoSources? Sources)
{
    public static PresentedVideo Of(Video video, IVideoAddresses addresses)
    {
        ArgumentNullException.ThrowIfNull(video);
        ArgumentNullException.ThrowIfNull(addresses);
        return new(
            video.Id, video.Caption.Value, video.Credit.Value, video.Description?.Value, video.Dimensions.Width, video.Dimensions.Height,
            video.Duration.Milliseconds, video.Preparation, video.IsReady ? addresses.Of(video.Id) : null);
    }
}
