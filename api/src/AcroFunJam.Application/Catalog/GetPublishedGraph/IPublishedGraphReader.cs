namespace AcroFunJam.Application.Catalog.GetPublishedGraph;

/// <summary>Read port: the published poses and transitions and the tags of the list, in one read (ADR 0037).</summary>
public interface IPublishedGraphReader
{
    Task<PublishedGraphElements> Read(CancellationToken ct);
}
