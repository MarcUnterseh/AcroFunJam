using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Catalog;

/// <summary>
/// Story 8: tagging a published transition directly (PUT /catalog/transitions/{id}/tags, ADR 0034), the transition found by its
/// poses and its name on the page of its start pose.
/// </summary>
[Binding]
public sealed class TransitionTagSteps(People people, Deployment deployment, TagListSetUp tagList, ScenarioResponses responses)
{
    private const string Transition = @"la transition (sans nom|""[^""]*"") de ""([^""]*)"" vers ""([^""]*)""";
    private const string Tags = @"((?:""[^""]+""(?:, | et )?)+)";

    [Given("la liste des étiquettes est la liste amorcée")]
    public Task GivenTheSeededTagList() => tagList.Seed();

    [Given("^(\\w+) a étiqueté " + Transition + " avec les étiquettes " + Tags + "$")]
    public async Task GivenSomeoneHasTaggedATransition(string person, string transition, string from, string to, string tags)
    {
        await WhenSomeoneTagsATransition(person, transition, from, to, tags);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.OK, await responses.Last.Content.ReadAsStringAsync());
    }

    [Given("^(\\w+) a retiré toutes les étiquettes de " + Transition + "$")]
    public async Task GivenSomeoneHasRemovedEveryTag(string person, string transition, string from, string to)
    {
        var client = await people.SignedInClient(person);
        responses.Last = await Tag(client, await IdOf(client, transition, from, to), []);
        responses.Last.StatusCode.ShouldBe(HttpStatusCode.OK, await responses.Last.Content.ReadAsStringAsync());
    }

    [When("^(\\w+) étiquette " + Transition + " avec les étiquettes " + Tags + "$")]
    public async Task WhenSomeoneTagsATransition(string person, string transition, string from, string to, string tags)
    {
        var client = await people.SignedInClient(person);
        responses.Last = await Tag(client, await IdOf(client, transition, from, to), await TagNames.IdsOf(client, TagNames.In(tags)));
    }

    [When("^un visiteur étiquette " + Transition + " avec les étiquettes " + Tags + "$")]
    public async Task WhenAVisitorTagsATransition(string transition, string from, string to, string tags)
    {
        using var visitor = deployment.Current.CreateClient();
        responses.Last = await Tag(visitor, await IdOf(visitor, transition, from, to), await TagNames.IdsOf(visitor, TagNames.In(tags)));
    }

    [When("^(\\w+) étiquette une transition qui n'existe pas dans le catalogue avec les étiquettes " + Tags + "$")]
    public async Task WhenSomeoneTagsAnUnknownTransition(string person, string tags)
    {
        var client = await people.SignedInClient(person);
        responses.Last = await Tag(client, Guid.NewGuid(), await TagNames.IdsOf(client, TagNames.In(tags)));
    }

    [Then(@"^l'étiquetage est refusé car (.+)$")]
    [Then(@"^l'étiquetage est impossible car (.+)$")]
    public async Task ThenTheTaggingIsRefused(string reason)
    {
        var (status, code) = reason switch
        {
            "il faut être connecté" => (HttpStatusCode.Unauthorized, (string?)null),
            "seul un validateur ou un administrateur gère les étiquettes" => (HttpStatusCode.Forbidden, "identity.capability-required"),
            "la transition est introuvable dans le catalogue" => (HttpStatusCode.NotFound, "catalog.transition-not-found"),
            _ when reason.EndsWith("n'est pas dans la liste des étiquettes", StringComparison.Ordinal) =>
                (HttpStatusCode.Conflict, "catalog.tag-not-in-list"),
            _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Motif de refus inconnu."),
        };
        var response = responses.Last.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(status, body);
        if (code is not null) JsonSerializer.Deserialize<JsonElement>(body).GetProperty("title").GetString().ShouldBe(code);
    }

    private static Task<HttpResponseMessage> Tag(HttpClient client, Guid transition, IEnumerable<AcroFunJam.Domain.SharedKernel.TagId> tags) =>
        client.PutAsJsonAsync(
            new Uri($"/catalog/transitions/{transition}/tags", UriKind.Relative), new { tagIds = tags.Select(t => t.Value) });

    /// <summary>The published transition between these poses, with this name (or without one), read on the page of its start pose.</summary>
    private static async Task<Guid> IdOf(HttpClient client, string transition, string from, string to)
    {
        var name = transition == "sans nom" ? null : transition.Trim('"');
        var list = await client.GetFromJsonAsync<PoseList>(new Uri("/catalog/poses", UriKind.Relative));
        var start = list!.Poses.Single(p => p.Name == from).Id;
        var page = await client.GetFromJsonAsync<PosePage>(new Uri($"/catalog/poses/{start}", UriKind.Relative));
        return page!.TransitionsFrom.Single(t => t.OtherPose.Name == to && t.Name == name).Id;
    }

    private sealed record PoseList(IReadOnlyList<PoseItem> Poses);

    private sealed record PoseItem(Guid Id, string Name);

    private sealed record PosePage(IReadOnlyList<LinkedTransition> TransitionsFrom);

    private sealed record LinkedTransition(Guid Id, PoseItem OtherPose, string? Name);
}
