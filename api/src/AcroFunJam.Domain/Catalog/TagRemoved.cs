using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A tag has been taken out of the list; it stays known for the history (L10).</summary>
public sealed record TagRemoved(TagId TagId, DateTimeOffset OccurredAt) : IDomainEvent;
