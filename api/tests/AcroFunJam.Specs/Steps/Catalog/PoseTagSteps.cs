using System.Net;
using System.Net.Http.Json;
using AcroFunJam.Application.Catalog.TagPose;
using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Identity;
using Microsoft.Extensions.DependencyInjection;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Catalog;

/// <summary>
/// Story 9a: the tags of the published poses, on their page (GET /catalog/poses/{id}) and in the catalog (GET /catalog/poses),
/// and the direct tagging of a pose (PUT /catalog/poses/{id}/tags, ADR 0036). A pose is found by its name in the catalog.
/// </summary>
[Binding]
public sealed class PoseTagSteps(People people, Deployment deployment, ScenarioResponses responses)
{
    private const string Tags = @"((?:""[^""]+""(?:, | et )?)+)";

    private PoseResponse? _page;

    // --- Set-up ---------------------------------------------------------------------------------

    /// <summary>Through the TagPose command, resolved from the application services (no HTTP, no policy), as for the roles (ADR 0009).</summary>
    [Given(@"^la pose ""([^""]+)"" porte (?:l'étiquette|les étiquettes) " + Tags + "$")]
    public async Task GivenThePoseCarries(string pose, string tags)
    {
        using var client = deployment.Current.CreateClient();
        var id = await IdOf(client, pose);
        var ids = await TagNames.IdsOf(client, TagNames.In(tags));
        using var scope = deployment.Current.Services.CreateScope();
        var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<TagPose, TagSet>>();
        var tagged = await handler.Handle(new TagPose(new PoseId(id), ids), CancellationToken.None);
        if (tagged.IsFailure) throw new InvalidOperationException($"Cannot tag the pose {pose}: {tagged.Error}.");
    }

    [Given(@"^(\w+) a étiqueté (?:entre-temps )?la pose ""([^""]+)"" avec les étiquettes " + Tags + "$")]
    public async Task GivenSomeoneHasTaggedAPose(string person, string pose, string tags)
    {
        await WhenSomeoneTagsAPose(person, pose, tags);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.OK, await responses.Last.Content.ReadAsStringAsync());
    }

    [Given(@"^(\w+) a retiré toutes les étiquettes de la pose ""([^""]+)""$")]
    public async Task GivenSomeoneHasRemovedEveryTagOfAPose(string person, string pose)
    {
        var client = await people.SignedInClient(person);
        responses.Last = await Tag(client, await IdOf(client, pose), []);
        responses.Last.StatusCode.ShouldBe(HttpStatusCode.OK, await responses.Last.Content.ReadAsStringAsync());
    }

    // --- Tagging --------------------------------------------------------------------------------

    [When(@"^(\w+) étiquette la pose ""([^""]+)"" avec les étiquettes " + Tags + "$")]
    public async Task WhenSomeoneTagsAPose(string person, string pose, string tags)
    {
        var client = await people.SignedInClient(person);
        responses.Last = await Tag(client, await IdOf(client, pose), await TagNames.IdsOf(client, TagNames.In(tags)));
    }

    [When(@"^un visiteur étiquette la pose ""([^""]+)"" avec les étiquettes " + Tags + "$")]
    public async Task WhenAVisitorTagsAPose(string pose, string tags)
    {
        using var visitor = deployment.Current.CreateClient();
        responses.Last = await Tag(visitor, await IdOf(visitor, pose), await TagNames.IdsOf(visitor, TagNames.In(tags)));
    }

    [When(@"^(\w+) étiquette une pose qui n'existe pas dans le catalogue avec les étiquettes " + Tags + "$")]
    public async Task WhenSomeoneTagsAnUnknownPose(string person, string tags)
    {
        var client = await people.SignedInClient(person);
        responses.Last = await Tag(client, Guid.NewGuid(), await TagNames.IdsOf(client, TagNames.In(tags)));
    }

    // --- Consulting -----------------------------------------------------------------------------

    [Then(@"^la page présente la pose ""([^""]+)"" sans étiquette$")]
    public async Task ThenThePagePresentsThePoseWithoutTag(string pose) => (await Page(pose)).Tags.ShouldBeEmpty();

    [Then(@"^la page présente la pose ""([^""]+)"" avec les étiquettes " + Tags + "$")]
    [Then(@"^la pose ""([^""]+)"" présente ses étiquettes dans cet ordre : " + Tags + "$")]
    public async Task ThenThePagePresentsThePoseWithTheTags(string pose, string tags) =>
        (await Page(pose)).Tags.Select(t => t.Name).ShouldBe(TagNames.In(tags));

    [Then(@"^la page de la pose ""([^""]+)"" indique qu'une modification de la pose est en attente de validation$")]
    public async Task ThenThePageTellsARevisionIsPending(string pose) => (await Page(pose)).PendingRevision.ShouldBeTrue();

    [Then("les poses du catalogue présentent exactement les étiquettes suivantes :")]
    public async Task ThenTheCatalogPresentsTheTags(DataTable expected)
    {
        using var visitor = deployment.Current.CreateClient();
        var list = await visitor.GetFromJsonAsync<PoseList>(new Uri("/catalog/poses", UriKind.Relative));
        list!.Poses.Select(p => (p.Name, string.Join(", ", p.Tags.Select(t => t.Name))))
            .ShouldBe(expected.Rows.Select(row => (row["nom"], row["étiquettes"])));
    }

    // --- Helpers --------------------------------------------------------------------------------

    /// <summary>The page of the pose, read once by the scenario (the last consultation, or a new one).</summary>
    private async Task<PoseResponse> Page(string pose)
    {
        if (responses.Last is { IsSuccessStatusCode: false } refused)
            refused.IsSuccessStatusCode.ShouldBeTrue(await refused.Content.ReadAsStringAsync());
        using var client = deployment.Current.CreateClient();
        _page = await client.GetFromJsonAsync<PoseResponse>(new Uri($"/catalog/poses/{await IdOf(client, pose)}", UriKind.Relative));
        return _page!;
    }

    private static Task<HttpResponseMessage> Tag(HttpClient client, Guid pose, IEnumerable<TagId> tags) =>
        client.PutAsJsonAsync(new Uri($"/catalog/poses/{pose}/tags", UriKind.Relative), new { tagIds = tags.Select(t => t.Value) });

    private static async Task<Guid> IdOf(HttpClient client, string pose)
    {
        var list = await client.GetFromJsonAsync<PoseList>(new Uri("/catalog/poses", UriKind.Relative));
        return list!.Poses.Single(p => p.Name == pose).Id;
    }

    // Black-box view of the HTTP contract (ADR 0036).
    private sealed record PoseList(IReadOnlyList<PoseItem> Poses);

    private sealed record PoseItem(Guid Id, string Name, IReadOnlyList<TagItem> Tags);

    private sealed record PoseResponse(Guid Id, string Name, IReadOnlyList<TagItem> Tags, bool PendingRevision);

    private sealed record TagItem(Guid Id, string Name);
}
