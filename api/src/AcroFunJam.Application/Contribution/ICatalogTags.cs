using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution;

/// <summary>
/// Port (anti-corruption layer towards Catalog, ADR 0016, ADR 0033): the list of tags chooses the tags of a transition, completed
/// with those they imply, and names them. Contribution never repeats the rules of the list.
/// </summary>
public interface ICatalogTags
{
    /// <summary>The tags of the list among these, completed with those they imply, and those not in the list.</summary>
    Task<TagChoice> Choose(IReadOnlyCollection<TagId> tags, CancellationToken ct);

    /// <summary>The current names of these tags, removed ones included (the history of a decided proposal).</summary>
    Task<IReadOnlyDictionary<TagId, TagName>> NamesOf(TagSet tags, CancellationToken ct);
}
