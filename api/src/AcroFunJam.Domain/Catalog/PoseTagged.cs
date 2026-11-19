using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A validator or an administrator replaced the tags of a published pose (story 9a, D1): it changed version.</summary>
public sealed record PoseTagged(PoseId PoseId, PoseVersion Version, TagSet Tags, DateTimeOffset OccurredAt) : IDomainEvent;
