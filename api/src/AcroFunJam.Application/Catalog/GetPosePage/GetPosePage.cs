using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.GetPosePage;

/// <summary>
/// The page of a published pose: its values, its version and its transitions from and to it (story 7, ADR 0030). The videos of
/// the transitions are presented to its audience (story 12, V11): a visitor by default, or whoever manages the videos, as the Api
/// evaluates it.
/// </summary>
public sealed record GetPosePage(PoseId Id)
{
    public VideoAudience Audience { get; init; } = VideoAudience.Visitor;
}

/// <summary>A tag carried by a transition, with its current name and its description (story 8, C4, ADR 0034).</summary>
public sealed record PresentedTag(TagId Id, TagName Name, TagDescription Description);

/// <summary>
/// A published pose with its version and its tags in catalog order (story 9a, V2), whether a revision of it is pending (D4),
/// and its published transitions from and to it, each list in the order of the domain; the tags of the transitions are
/// presented in catalog order (C2).
/// </summary>
public sealed record PosePage(
    PoseId Id, PoseName Name, Difficulty Difficulty, FlowBoundaries Flow, PoseVersion Version,
    IReadOnlyList<LinkedTransition> TransitionsFrom, IReadOnlyList<LinkedTransition> TransitionsTo,
    IReadOnlyDictionary<TagId, PresentedTag> Tags, IReadOnlyList<PresentedTag> PoseTags, bool HasPendingRevision)
{
    /// <summary>The photos of the pose, the main photo first, then the others in the order of addition (story 10, R17).</summary>
    public IReadOnlyList<PresentedPhoto> Photos { get; init; } = [];

    /// <summary>The videos of the transitions that have some, as presented to the audience, in the order of addition (story 12, V18).</summary>
    public IReadOnlyDictionary<TransitionId, IReadOnlyList<PresentedVideo>> Videos { get; init; } =
        new Dictionary<TransitionId, IReadOnlyList<PresentedVideo>>();

    public IReadOnlyList<PresentedVideo> VideosOf(LinkedTransition transition)
    {
        ArgumentNullException.ThrowIfNull(transition);
        return Videos.GetValueOrDefault(transition.Id) ?? [];
    }

    /// <summary>These tags, presented in catalog order; a tag unknown to the list is left out.</summary>
    public static IReadOnlyList<PresentedTag> Presented(TagSet tags, IReadOnlyDictionary<TagId, PresentedTag> known)
    {
        ArgumentNullException.ThrowIfNull(tags);
        ArgumentNullException.ThrowIfNull(known);
        return [.. tags.Ids.Select(id => known.GetValueOrDefault(id)).OfType<PresentedTag>().OrderBy(t => t.Name, TagName.CatalogOrder)];
    }

    public IReadOnlyList<PresentedTag> TagsOf(LinkedTransition transition)
    {
        ArgumentNullException.ThrowIfNull(transition);
        return Presented(transition.Tags, Tags);
    }
}
