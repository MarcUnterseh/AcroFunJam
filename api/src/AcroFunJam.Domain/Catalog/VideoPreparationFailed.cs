using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A video could not be prepared: it is shown as such to whoever manages the videos, who removes it (V11).</summary>
public sealed record VideoPreparationFailed(TransitionId TransitionId, VideoId VideoId, DateTimeOffset OccurredAt) : IDomainEvent;
