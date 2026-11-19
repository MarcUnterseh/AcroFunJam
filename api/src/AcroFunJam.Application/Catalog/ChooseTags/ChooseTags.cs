using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.ChooseTags;

/// <summary>
/// The list chooses tags for a transition, or a pose (story 9a), of Contribution (Open Host Service of the Catalog, ADR 0033,
/// ADR 0036).
/// </summary>
public sealed record ChooseTags(IReadOnlyCollection<TagId> Tags, TagTarget Target = TagTarget.Transition);
