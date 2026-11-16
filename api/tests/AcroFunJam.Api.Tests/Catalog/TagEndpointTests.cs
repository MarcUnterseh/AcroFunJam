using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Api.Tests.Contribution;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Api.Tests.Catalog;

/// <summary>
/// The list of tags as seeded at start-up (ADR 0032) and the refusal to remove an implied tag (ADR 0034), on the real Api
/// and a real PostgreSQL.
/// </summary>
[Trait("Category", "Integration")]
public sealed class TagEndpointTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private static readonly Uri Tags = new("/catalog/tags", UriKind.Relative);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private async Task<IReadOnlyList<JsonElement>> SeededTags()
    {
        using var visitor = api.CreateClient();
        var response = await visitor.GetAsync(Tags, Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        return [.. (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("tags").EnumerateArray()];
    }

    [Fact]
    public async Task GetTags_Should_PublishWhichTagEachOneImplies_When_TheListIsSeeded()
    {
        var tags = await SeededTags();
        var dynamic = tags.Single(t => t.GetProperty("name").GetString() == "dynamique").GetProperty("id").GetGuid();

        tags.Where(t => t.GetProperty("impliedTagId").ValueKind != JsonValueKind.Null)
            .Select(t => (t.GetProperty("name").GetString(), t.GetProperty("impliedTagId").GetGuid()))
            .ShouldBe([("icarien", dynamic), ("pop", dynamic), ("whip", dynamic)]);
        tags.ShouldAllBe(t => t.GetProperty("transitionCount").GetInt32() == 0);
    }

    [Fact]
    public async Task DeleteTag_Should_Answer409TagImpliedWithTheTagsImplyingIt_When_ATagOfTheListImpliesIt()
    {
        var tags = await SeededTags();
        var dynamic = tags.Single(t => t.GetProperty("name").GetString() == "dynamique").GetProperty("id").GetGuid();
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var _ = bruno;

        var response = await bruno.DeleteAsync(new Uri($"/catalog/tags/{dynamic}", UriKind.Relative), Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        problem.GetProperty("title").GetString().ShouldBe("catalog.tag-implied");
        problem.GetProperty("impliedBy").EnumerateArray().Select(t => t.GetProperty("name").GetString()).ShouldBe(["icarien", "pop", "whip"]);
    }

    [Fact]
    public async Task PutTag_Should_Answer404TagNotFound_When_TheTagIsNotInTheList()
    {
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var _ = bruno;

        var response = await bruno.PutAsJsonAsync(
            new Uri($"/catalog/tags/{Guid.NewGuid()}", UriKind.Relative), new { name = "pop", description = "La base propulse le flyer." }, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("title").GetString().ShouldBe("catalog.tag-not-found");
    }
}
