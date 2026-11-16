using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>A tag has been renamed: its new name is followed everywhere it is carried (L8).</summary>
public sealed record TagRenamed(TagId TagId, TagName Name, DateTimeOffset OccurredAt) : IDomainEvent;
