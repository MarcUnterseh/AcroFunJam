using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A tag has been added to the list by a validator or an administrator (L4), with what it applies to (story 9a).</summary>
public sealed record TagAdded(TagId TagId, TagName Name, TagScope Scope, DateTimeOffset OccurredAt) : IDomainEvent;
