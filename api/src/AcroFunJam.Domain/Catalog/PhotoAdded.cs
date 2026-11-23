using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A photo has been added to a pose (R1).</summary>
public sealed record PhotoAdded(PoseId PoseId, PhotoId PhotoId, DateTimeOffset OccurredAt) : IDomainEvent;
