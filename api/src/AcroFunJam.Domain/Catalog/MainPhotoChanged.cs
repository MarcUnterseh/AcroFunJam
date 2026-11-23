using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>Another photo has been chosen as the main photo of the pose, its thumbnail in the catalog (R12).</summary>
public sealed record MainPhotoChanged(PoseId PoseId, PhotoId PhotoId, DateTimeOffset OccurredAt) : IDomainEvent;
