using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetPendingRevisionOfPose;

/// <summary>
/// Whether the published pose <paramref name="Pose"/> already has a pending revision, so that the site tells it as soon as the
/// form opens (story 6, decision D); <paramref name="Requester"/> learns whether it is theirs.
/// </summary>
public sealed record GetPendingRevisionOfPose(ContributorId Requester, PublishedPoseId Pose);

/// <summary>The pending revision of a pose: only whether the requester proposed it, never who did.</summary>
public sealed record PendingRevisionOfPose(bool IsYours);
