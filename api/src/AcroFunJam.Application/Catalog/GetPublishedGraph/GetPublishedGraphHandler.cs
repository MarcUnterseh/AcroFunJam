using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.GetPublishedGraph;

/// <summary>The graph and the tags of the list come from one read: the flow presented is the one the generator checked (ADR 0037).</summary>
internal sealed class GetPublishedGraphHandler(IPublishedGraphReader reader) : IQueryHandler<GetPublishedGraph, PublishedCatalogGraph>
{
    public async Task<Result<PublishedCatalogGraph>> Handle(GetPublishedGraph query, CancellationToken ct)
    {
        var elements = await reader.Read(ct);
        return Result<PublishedCatalogGraph>.Success(new PublishedCatalogGraph(elements.Poses, elements.Transitions, elements.TagsOfTheList));
    }
}
