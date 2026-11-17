using System.Net.Http.Json;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Specs.Support.Catalog;

/// <summary>The tags of the steps, by name: « "whip" et "inversion" », and their identifiers in the list (story 8).</summary>
public static class TagNames
{
    public static IReadOnlyList<string> In(string quoted) => [.. quoted.Split('"').Where((_, index) => index % 2 == 1)];

    /// <summary>
    /// The identifiers of these tags in the list, read through GET /catalog/tags; a name absent from the list (« classique »)
    /// gets an identifier no tag has.
    /// </summary>
    public static async Task<IReadOnlyList<TagId>> IdsOf(HttpClient client, IReadOnlyList<string> names)
    {
        var list = await client.GetFromJsonAsync<TagList>(new Uri("/catalog/tags", UriKind.Relative));
        return [.. names.Select(name => new TagId(list!.Tags.SingleOrDefault(t => t.Name == name)?.Id ?? Guid.NewGuid()))];
    }

    private sealed record TagList(IReadOnlyList<TagItem> Tags);

    private sealed record TagItem(Guid Id, string Name);
}
