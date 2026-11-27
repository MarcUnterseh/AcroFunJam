using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A video has been added to a transition, in preparation (V1, V11).</summary>
public sealed record VideoAdded(TransitionId TransitionId, VideoId VideoId, DateTimeOffset OccurredAt) : IDomainEvent;
