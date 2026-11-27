using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// A video of a transition (story 12): its caption, credit and optional description, its presented dimensions (planned while in
/// preparation, then those of the prepared video), its duration, its preparation, the confirmation of the rights and its rank of
/// addition, which orders the videos.
/// </summary>
public sealed class Video : Entity<VideoId>
{
    public VideoCaption Caption { get; private set; }
    public VideoCredit Credit { get; private set; }

    /// <summary>None when the video was added or corrected without one (V23).</summary>
    public VideoDescription? Description { get; private set; }

    public VideoDimensions Dimensions { get; private set; }
    public VideoDuration Duration { get; private set; }
    public VideoPreparation Preparation { get; private set; }
    public RightsConfirmation Rights { get; }
    public int AdditionRank { get; }
    public DateTimeOffset AddedAt { get; }

    private Video(
        VideoId id, VideoCaption caption, VideoCredit credit, VideoDescription? description, VideoDimensions dimensions,
        VideoDuration duration, VideoPreparation preparation, RightsConfirmation rights, int additionRank, DateTimeOffset addedAt) : base(id)
    {
        Caption = caption;
        Credit = credit;
        Description = description;
        Dimensions = dimensions;
        Duration = duration;
        Preparation = preparation;
        Rights = rights;
        AdditionRank = additionRank;
        AddedAt = addedAt;
    }

    /// <summary>A new video, in preparation, planned in its presented dimensions (V9).</summary>
    internal static Video New(
        VideoId id, VideoFile file, VideoCaption caption, VideoCredit credit, VideoDescription? description, RightsConfirmation rights,
        int rank, DateTimeOffset now) =>
        new(id, caption, credit, description, file.Dimensions.Presented(), file.Duration, VideoPreparation.InPreparation, rights, rank, now);

    /// <summary>Restores a video loaded from storage.</summary>
    public static Video Rehydrate(
        VideoId id, VideoCaption caption, VideoCredit credit, VideoDescription? description, VideoDimensions dimensions,
        VideoDuration duration, VideoPreparation preparation, RightsConfirmation rights, int additionRank, DateTimeOffset addedAt) =>
        new(id, caption, credit, description, dimensions, duration, preparation, rights, additionRank, addedAt);

    public bool IsReady => Preparation == VideoPreparation.Ready;

    /// <returns>Whether the video became ready (otherwise, it lied about its duration and could not be prepared).</returns>
    internal bool Prepare(PreparedVideo prepared)
    {
        if (prepared.Duration.ExceedsTheLimitByMoreThanTheTolerance)
        {
            Preparation = VideoPreparation.Failed;
            return false;
        }

        Dimensions = prepared.Dimensions;
        Duration = prepared.Duration;
        Preparation = VideoPreparation.Ready;
        return true;
    }

    internal void FailPreparation() => Preparation = VideoPreparation.Failed;

    /// <returns>Whether anything changed.</returns>
    internal bool Correct(VideoCaption caption, VideoCredit credit, VideoDescription? description)
    {
        if (Caption == caption && Credit == credit && Description == description) return false;
        Caption = caption;
        Credit = credit;
        Description = description;
        return true;
    }
}
