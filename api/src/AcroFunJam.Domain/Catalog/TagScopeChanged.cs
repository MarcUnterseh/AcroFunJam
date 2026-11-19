using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>What a tag applies to has been changed by a validator or an administrator (story 9a, A4).</summary>
public sealed record TagScopeChanged(TagId TagId, TagScope Scope, DateTimeOffset OccurredAt) : IDomainEvent;
