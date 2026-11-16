using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Catalog;

/// <summary>The list of tags has been seeded with the initial tags, once, at the first deployment (L1).</summary>
public sealed record TagListSeeded(TagListId TagListId, DateTimeOffset OccurredAt) : IDomainEvent;
