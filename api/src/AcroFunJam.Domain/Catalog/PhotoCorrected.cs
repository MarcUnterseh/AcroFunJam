using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>The alternative text or the credit of a photo has been corrected (R14).</summary>
public sealed record PhotoCorrected(PoseId PoseId, PhotoId PhotoId, DateTimeOffset OccurredAt) : IDomainEvent;
