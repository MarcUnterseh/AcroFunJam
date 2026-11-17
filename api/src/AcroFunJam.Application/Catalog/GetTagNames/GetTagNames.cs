using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.GetTagNames;

/// <summary>The current names of tags, removed ones included (the history of a decided proposal), in catalog order (ADR 0033).</summary>
public sealed record GetTagNames(TagSet Tags);

/// <summary>A tag designated by its identifier and its current name (ADR 0034).</summary>
public sealed record NamedTag(TagId Id, TagName Name);
