using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.GetPosePage;

/// <summary>The page of a published pose: its values, its version and its transitions from and to it (story 7, ADR 0030).</summary>
public sealed record GetPosePage(PoseId Id);

/// <summary>A tag carried by a transition, with its current name and its description (story 8, C4, ADR 0034).</summary>
public sealed record PresentedTag(TagId Id, TagName Name, TagDescription Description);

/// <summary>
/// A published pose with its version, and its published transitions from and to it, each list in the order of the domain; the tags
/// of the transitions are presented in catalog order (C2).
/// </summary>
public sealed record PosePage(
    PoseId Id, PoseName Name, Difficulty Difficulty, FlowBoundaries Flow, PoseVersion Version,
    IReadOnlyList<LinkedTransition> TransitionsFrom, IReadOnlyList<LinkedTransition> TransitionsTo,
    IReadOnlyDictionary<TagId, PresentedTag> Tags)
{
    public IReadOnlyList<PresentedTag> TagsOf(LinkedTransition transition)
    {
        ArgumentNullException.ThrowIfNull(transition);
        return [.. transition.Tags.Ids.Select(id => Tags.GetValueOrDefault(id)).OfType<PresentedTag>().OrderBy(t => t.Name, TagName.CatalogOrder)];
    }
}
