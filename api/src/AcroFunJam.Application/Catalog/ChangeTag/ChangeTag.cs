using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.ChangeTag;

/// <summary>
/// A validator or an administrator renames a tag, changes its description (story 8, L8, L9) or what it applies to (story 9a,
/// A4); all three are given.
/// </summary>
public sealed record ChangeTag(TagId Id, TagName Name, TagDescription Description, TagScope Scope);
