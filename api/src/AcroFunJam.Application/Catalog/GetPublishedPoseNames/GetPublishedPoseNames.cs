using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.GetPublishedPoseNames;

/// <summary>
/// The current names of published poses, in one batch (Open Host Service of the Catalog, story 7, ADR 0028): an identifier
/// missing from the result is not a published pose.
/// </summary>
public sealed record GetPublishedPoseNames(IReadOnlyCollection<PoseId> Ids);
