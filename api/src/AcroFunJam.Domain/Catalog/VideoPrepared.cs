using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A video is ready: it is presented to everybody (V11).</summary>
public sealed record VideoPrepared(TransitionId TransitionId, VideoId VideoId, DateTimeOffset OccurredAt) : IDomainEvent;
