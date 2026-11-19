using AcroFunJam.Application.Catalog.ChooseTags;
using AcroFunJam.Application.Catalog.GetTagNames;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Contribution;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>Anti-corruption layer Contribution → Catalog (ADR 0016, ADR 0033): the list of tags chooses and names the tags.</summary>
public sealed class CatalogTags(
    IQueryHandler<ChooseTags, TagChoice> chooseTags, IQueryHandler<GetTagNames, IReadOnlyList<NamedTag>> getTagNames) : ICatalogTags
{
    public async Task<TagChoice> Choose(IReadOnlyCollection<TagId> tags, CancellationToken ct) =>
        (await chooseTags.Handle(new ChooseTags(tags, TagTarget.Transition), ct)).Value!;

    public async Task<TagChoice> ChooseForPose(IReadOnlyCollection<TagId> tags, CancellationToken ct) =>
        (await chooseTags.Handle(new ChooseTags(tags, TagTarget.Pose), ct)).Value!;

    public async Task<IReadOnlyDictionary<TagId, TagName>> NamesOf(TagSet tags, CancellationToken ct) =>
        (await getTagNames.Handle(new GetTagNames(tags), ct)).Value!.ToDictionary(t => t.Id, t => t.Name);
}
