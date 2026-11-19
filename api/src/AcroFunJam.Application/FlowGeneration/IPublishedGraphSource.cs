namespace AcroFunJam.Application.FlowGeneration;

/// <summary>Port (anti-corruption layer towards Catalog, ADR 0037): the published graph, as the generation sees it.</summary>
public interface IPublishedGraphSource
{
    Task<PublishedGraph> Read(CancellationToken ct);
}
