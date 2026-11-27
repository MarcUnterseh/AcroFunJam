using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.CorrectTransitionVideo;

/// <summary>
/// A validator or an administrator corrects the caption, the credit and the description of a video, with the rules of an addition
/// (story 12, V17, V23); changing the file is removing then adding.
/// </summary>
public sealed record CorrectTransitionVideo(TransitionId Transition, VideoId Video, string? Caption, string? Credit, string? Description);
