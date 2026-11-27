using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A video has been removed from its transition, immediately, whatever its preparation (V16).</summary>
public sealed record VideoRemoved(TransitionId TransitionId, VideoId VideoId, DateTimeOffset OccurredAt) : IDomainEvent;
