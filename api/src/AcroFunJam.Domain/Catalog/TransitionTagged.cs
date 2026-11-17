using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A validator has replaced the tags of a published transition (story 8, P2, ADR 0033).</summary>
public sealed record TransitionTagged(TransitionId TransitionId, TagSet Tags, DateTimeOffset OccurredAt) : IDomainEvent;
