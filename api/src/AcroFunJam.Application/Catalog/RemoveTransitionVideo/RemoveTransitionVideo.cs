using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.RemoveTransitionVideo;

/// <summary>A validator or an administrator removes a video, immediately, whatever its preparation (story 12, V16).</summary>
public sealed record RemoveTransitionVideo(TransitionId Transition, VideoId Video);
