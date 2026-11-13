using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.IsTransitionSlotPublished;

/// <summary>
/// Whether a published transition takes this place between two poses, in this direction: that of this name key, or the unnamed
/// one (Open Host Service of the Catalog, story 7, ADR 0029).
/// </summary>
public sealed record IsTransitionSlotPublished(PoseId FromPose, PoseId ToPose, TransitionNameKey? NameKey);
