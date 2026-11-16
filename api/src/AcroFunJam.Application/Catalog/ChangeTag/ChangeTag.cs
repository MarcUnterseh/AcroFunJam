using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.ChangeTag;

/// <summary>A validator or an administrator renames a tag or changes its description (story 8, L8, L9); both are given.</summary>
public sealed record ChangeTag(TagId Id, TagName Name, TagDescription Description);
