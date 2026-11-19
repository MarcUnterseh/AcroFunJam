using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.TagPose;

/// <summary>A validator or an administrator replaces the tags of a published pose (story 9a, D1): none removes them all.</summary>
public sealed record TagPose(PoseId Pose, IReadOnlyCollection<TagId> Tags);
