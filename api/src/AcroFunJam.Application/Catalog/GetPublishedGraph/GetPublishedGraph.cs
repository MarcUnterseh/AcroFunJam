using AcroFunJam.Application.Catalog.GetTagNames;
using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.GetPublishedGraph;

/// <summary>
/// The published graph of the catalog, offered to the generation of flows (Open Host Service, story 9, ADR 0037): only what is
/// published, never a pending proposal (G10).
/// </summary>
public sealed record GetPublishedGraph;

/// <summary>A published transition with what presents it: its poses, its name and description (if any), its difficulty and its tags.</summary>
public sealed record PublishedTransitionSummary(
    TransitionId Id, PoseId From, PoseId To, TransitionName? Name, Difficulty Difficulty, TransitionDescription? Description, TagSet Tags);

/// <summary>The published poses and transitions and the tags of the list, in catalog order, read together (one snapshot).</summary>
public sealed record PublishedGraphElements(
    IReadOnlyList<PublishedPoseSummary> Poses, IReadOnlyList<PublishedTransitionSummary> Transitions, IReadOnlyList<NamedTag> TagsOfTheList);

/// <summary>The published graph and the tags of the list, in catalog order (their tags are already completed by the list, ADR 0033).</summary>
public sealed record PublishedCatalogGraph(
    IReadOnlyList<PublishedPoseSummary> Poses, IReadOnlyList<PublishedTransitionSummary> Transitions, IReadOnlyList<NamedTag> TagsOfTheList);
