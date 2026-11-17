using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.ChooseTags;

/// <summary>The list chooses tags for a transition of Contribution (Open Host Service of the Catalog, ADR 0033).</summary>
public sealed record ChooseTags(IReadOnlyCollection<TagId> Tags);
