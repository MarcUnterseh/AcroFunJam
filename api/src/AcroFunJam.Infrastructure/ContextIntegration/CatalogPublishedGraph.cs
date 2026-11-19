using AcroFunJam.Application.Catalog.GetPublishedGraph;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.FlowGeneration;
using AcroFunJam.Domain.FlowGeneration;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// Anti-corruption layer Flow generation → Catalog (ADR 0037): the published graph of the catalog, its identifiers translated, with
/// the details that present its elements (names, descriptions, tags of the list named, in catalog order).
/// </summary>
public sealed class CatalogPublishedGraph(IQueryHandler<GetPublishedGraph, PublishedCatalogGraph> getPublishedGraph) : IPublishedGraphSource
{
    public async Task<PublishedGraph> Read(CancellationToken ct)
    {
        var read = await getPublishedGraph.Handle(new GetPublishedGraph(), ct);
        var catalog = read.IsSuccess
            ? read.Value!
            : throw new InvalidOperationException($"The published graph could not be read: {read.Error!.Code}.");
        var list = catalog.TagsOfTheList.Select(tag => new FlowTag(tag.Id, tag.Name)).ToList();
        IReadOnlyList<FlowTag> Named(TagSet tags) => [.. list.Where(tag => tags.Contains(tag.Id))];

        var graph = new FlowGraph(
            catalog.Poses.Select(pose => new FlowPose(
                PoseId(pose.Id.Value), pose.Flow, Difficulty.Create(pose.BaseDifficulty, pose.FlyerDifficulty).Value!, pose.Tags)),
            catalog.Transitions.Select(transition => new FlowTransition(
                TransitionId(transition.Id.Value), PoseId(transition.From.Value), PoseId(transition.To.Value), transition.Difficulty, transition.Tags)),
            TagSet.Of(list.Select(tag => tag.Id)));
        var details = new FlowElementDetails(
            catalog.Poses.ToDictionary(pose => PoseId(pose.Id.Value), pose => new FlowPoseDetails(pose.Name, Named(pose.Tags))),
            catalog.Transitions.ToDictionary(
                transition => TransitionId(transition.Id.Value),
                transition => new FlowTransitionDetails(transition.Name, transition.Description, Named(transition.Tags))));
        return new PublishedGraph(graph, details);
    }

    private static FlowPoseId PoseId(Guid id) => new(id);

    private static FlowTransitionId TransitionId(Guid id) => new(id);
}
