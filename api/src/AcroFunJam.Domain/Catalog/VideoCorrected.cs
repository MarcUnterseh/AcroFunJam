using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>The caption, the credit or the description of a video has changed (V17, V23).</summary>
public sealed record VideoCorrected(TransitionId TransitionId, VideoId VideoId, DateTimeOffset OccurredAt) : IDomainEvent;
