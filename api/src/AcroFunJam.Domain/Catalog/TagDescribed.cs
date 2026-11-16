using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>The description of a tag has changed (L9).</summary>
public sealed record TagDescribed(TagId TagId, DateTimeOffset OccurredAt) : IDomainEvent;
