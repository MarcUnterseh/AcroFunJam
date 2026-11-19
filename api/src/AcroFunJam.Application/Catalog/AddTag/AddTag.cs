using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.AddTag;

/// <summary>A validator or an administrator adds a tag to the list (story 8, L4 to L7), with what it applies to (story 9a, A3).</summary>
public sealed record AddTag(TagName Name, TagDescription Description, TagScope Scope);
