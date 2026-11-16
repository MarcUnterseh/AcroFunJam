using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A tag has been added to the list by a validator or an administrator (L4).</summary>
public sealed record TagAdded(TagId TagId, TagName Name, DateTimeOffset OccurredAt) : IDomainEvent;
