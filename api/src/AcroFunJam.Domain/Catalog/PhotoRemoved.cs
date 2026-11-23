using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A photo has been removed from a pose; it is no longer shown, even by its address (R13).</summary>
public sealed record PhotoRemoved(PoseId PoseId, PhotoId PhotoId, DateTimeOffset OccurredAt) : IDomainEvent;
