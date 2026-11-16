using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.RemoveTag;

/// <summary>A validator or an administrator takes a tag out of the list (story 8, L10).</summary>
public sealed record RemoveTag(TagId Id);
