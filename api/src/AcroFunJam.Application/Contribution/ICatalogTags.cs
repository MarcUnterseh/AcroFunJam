using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution;

/// <summary>
/// Port (anti-corruption layer towards Catalog, ADR 0016, ADR 0033): the list of tags chooses the tags of a transition or a pose, completed
/// with those they imply, and names them. Contribution never repeats the rules of the list.
/// </summary>
public interface ICatalogTags
{
    /// <summary>
    /// The tags of the list among these that apply to the transitions, completed with those they imply, those not in the list and
    /// those that do not apply to the transitions (ADR 0035).
    /// </summary>
    Task<TagChoice> Choose(IReadOnlyCollection<TagId> tags, CancellationToken ct);

    /// <summary>The same choice for a pose (story 9a, ADR 0036): only the tags that apply to the poses.</summary>
    Task<TagChoice> ChooseForPose(IReadOnlyCollection<TagId> tags, CancellationToken ct);

    /// <summary>The current names of these tags, removed ones included (the history of a decided proposal).</summary>
    Task<IReadOnlyDictionary<TagId, TagName>> NamesOf(TagSet tags, CancellationToken ct);
}
