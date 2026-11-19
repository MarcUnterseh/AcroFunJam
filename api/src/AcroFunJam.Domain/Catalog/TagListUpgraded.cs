using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>The list, seeded at an older revision, has been brought up to this revision of the initial list (ADR 0035).</summary>
public sealed record TagListUpgraded(TagListId TagListId, int Revision, DateTimeOffset OccurredAt) : IDomainEvent;
