using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Api.Endpoints.Contribution;

/// <summary>
/// The current names of the tags of an answer (story 8, ADR 0034), read in one batch through the anti-corruption layer towards the
/// Catalog, removed tags included (the history of a decided proposal).
/// </summary>
public sealed class TagNames
{
    private readonly IReadOnlyDictionary<TagId, TagName> _names;

    private TagNames(IReadOnlyDictionary<TagId, TagName> names) => _names = names;

    public static TagNames None { get; } = new(new Dictionary<TagId, TagName>());

    public static async Task<TagNames> Of(ICatalogTags catalogTags, IEnumerable<TagSet> sets, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(catalogTags);
        var all = TagSet.Of(sets.SelectMany(set => set.Ids));
        return all.Count == 0 ? None : new TagNames(await catalogTags.NamesOf(all, ct));
    }

    /// <summary>These tags, under their current names, in catalog order.</summary>
    public IReadOnlyList<ProposalTagResponse> Of(TagSet tags)
    {
        ArgumentNullException.ThrowIfNull(tags);
        return [.. tags.Ids.Where(_names.ContainsKey).Select(id => (Id: id, Name: _names[id])).OrderBy(t => t.Name, TagName.CatalogOrder)
            .Select(t => new ProposalTagResponse(t.Id.Value, t.Name.Value))];
    }
}

/// <summary>A tag of a transition proposal: its identifier and its current name (ADR 0034).</summary>
public sealed record ProposalTagResponse(Guid Id, string Name);
