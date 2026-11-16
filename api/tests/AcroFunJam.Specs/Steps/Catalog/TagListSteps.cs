using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Catalog;

/// <summary>
/// The list of tags of the catalog (story 8, ADR 0032, ADR 0034), through its HTTP contract. Its set-up goes through the
/// use cases (<see cref="TagListSetUp"/>), its outcomes through <c>GET /catalog/tags</c>.
/// </summary>
[Binding]
public sealed class TagListSteps(People people, Deployment deployment, TagListSetUp tagList, ScenarioResponses responses)
{
    private const string Text = "« ?(.*?) ?»";
    private const string Names = @"((?:""[^""]+""(?:, | et )?)+)";

    private static readonly Uri Tags = new("/catalog/tags", UriKind.Relative);

    private IReadOnlyList<TagResponse>? _consulted;

    // --- Deployments --------------------------------------------------------------------------

    [Given("AcroFunJam est déployé pour la première fois")]
    public void GivenDeployedForTheFirstTime() => deployment.DeploySeedingTheInitialTagList();

    [When("AcroFunJam est déployé de nouveau")]
    public void WhenDeployedAgain() => deployment.DeploySeedingTheInitialTagList();

    // --- States -------------------------------------------------------------------------------

    [Given("la liste des étiquettes contient :")]
    public async Task GivenTheTagListContains(DataTable tags)
    {
        foreach (var row in tags.Rows) await tagList.Add(row["étiquette"], row["description"]);
    }

    [Given(@"^l'étiquette ""([^""]+)"" dans la liste des étiquettes$")]
    public Task GivenTheTag(string name) => tagList.Add(name, DescriptionOf(name));

    [Given(@"^l'étiquette ""([^""]+)"" dans la liste des étiquettes, avec la description " + Text + "$")]
    public Task GivenTheTagWithDescription(string name, string description) => tagList.Add(name, description);

    [Given("^les étiquettes " + Names + " dans la liste des étiquettes$")]
    public async Task GivenTheTags(string names)
    {
        foreach (var name in Quoted(names)) await tagList.Add(name, DescriptionOf(name));
    }

    [Given(@"^(\w+) a retiré l'étiquette ""([^""]+)"" de la liste$")]
    public async Task GivenSomeoneHasRemovedATag(string person, string name)
    {
        await WhenSomeoneRemovesATag(person, name);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.NoContent, await responses.Last.Content.ReadAsStringAsync());
    }

    // --- Consulting ---------------------------------------------------------------------------

    [When("un visiteur consulte la liste des étiquettes")]
    public async Task WhenAVisitorConsultsTheTagList() => _consulted = await Consult();

    // --- Managing -----------------------------------------------------------------------------

    [When(@"^(\w+) ajoute à la liste l'étiquette (""[^""]*""|un nom de \d+ caractères) avec la description " + Text + "$")]
    public async Task WhenSomeoneAddsATag(string person, string name, string description) =>
        responses.Last = await (await people.SignedInClient(person)).PostAsJsonAsync(Tags, new { name = NameOf(name), description });

    [When(@"^(\w+) ajoute à la liste une étiquette au nom de (\d+) caractères$")]
    public Task WhenSomeoneAddsATagWhoseNameHasLength(string person, int length) =>
        WhenSomeoneAddsATag(person, $"un nom de {length} caractères", "Une étiquette au nom le plus long.");

    [When(@"^(\w+) ajoute à la liste l'étiquette ""([^""]*)"" avec une description de (\d+) caractères$")]
    public Task WhenSomeoneAddsATagWhoseDescriptionHasLength(string person, string name, int length) =>
        WhenSomeoneAddsATag(person, $"\"{name}\"", OfLength(length, 'd'));

    [When(@"^(\w+) ajoute à la liste l'étiquette ""([^""]*)"" avec aucune description$")]
    public async Task WhenSomeoneAddsATagWithoutDescription(string person, string name) =>
        responses.Last = await (await people.SignedInClient(person)).PostAsJsonAsync(Tags, new { name });

    [When(@"^un visiteur ajoute à la liste l'étiquette ""([^""]*)"" avec la description " + Text + "$")]
    public async Task WhenAVisitorAddsATag(string name, string description)
    {
        using var visitor = deployment.Current.CreateClient();
        responses.Last = await visitor.PostAsJsonAsync(Tags, new { name, description });
    }

    [When(@"^(\w+) renomme l'étiquette ""([^""]+)"" en ""([^""]*)""$")]
    public async Task WhenSomeoneRenamesATag(string person, string name, string newName)
    {
        var tag = await Find(name);
        responses.Last = await (await people.SignedInClient(person)).PutAsJsonAsync(TagUri(tag), new { name = newName, description = tag.Description });
    }

    [When(@"^(\w+) change la description de l'étiquette ""([^""]+)"" en " + Text + "$")]
    public async Task WhenSomeoneDescribesATag(string person, string name, string description)
    {
        var tag = await Find(name);
        responses.Last = await (await people.SignedInClient(person)).PutAsJsonAsync(TagUri(tag), new { name = tag.Name, description });
    }

    [When(@"^(\w+) retire l'étiquette ""([^""]+)"" de la liste$")]
    public async Task WhenSomeoneRemovesATag(string person, string name)
    {
        var tag = await Find(name);
        responses.Last = await (await people.SignedInClient(person)).DeleteAsync(TagUri(tag));
    }

    // --- Outcomes -----------------------------------------------------------------------------

    [Then("la liste des étiquettes présente exactement :")]
    public async Task ThenTheTagListPresentsExactly(DataTable expected) =>
        (await Presented()).Select(t => (t.Name, t.Description))
            .ShouldBe(expected.Rows.Select(row => (row["étiquette"], row["description"])));

    [Then(@"^la liste des étiquettes présente l'étiquette ""([^""]+)""$")]
    public async Task ThenTheTagListPresents(string name) => (await Presented()).Select(t => t.Name).ShouldContain(name);

    [Then(@"^la liste des étiquettes présente l'étiquette au nom de (\d+) caractères$")]
    public Task ThenTheTagListPresentsTheTagWhoseNameHasLength(int length) => ThenTheTagListPresents(OfLength(length, 'v'));

    [Then(@"^la liste des étiquettes présente l'étiquette ""([^""]+)"" avec la description " + Text + "$")]
    public async Task ThenTheTagListPresentsWithDescription(string name, string description) =>
        (await Presented()).Where(t => t.Name == name).ShouldHaveSingleItem().Description.ShouldBe(description);

    [Then(@"^la liste des étiquettes ne présente pas l'étiquette ""([^""]+)""$")]
    public async Task ThenTheTagListDoesNotPresent(string name) => (await Presented()).Select(t => t.Name).ShouldNotContain(name);

    [Then("^la liste des étiquettes présente exactement les étiquettes " + Names + "$")]
    public async Task ThenTheTagListPresentsExactlyTheTags(string names) =>
        (await Presented()).Select(t => t.Name).ShouldBe(Quoted(names));

    [Then("^les étiquettes sont présentées dans cet ordre : " + Names + "$")]
    public void ThenTheTagsArePresentedInThisOrder(string names) =>
        _consulted.ShouldNotBeNull().Select(t => t.Name).ShouldBe(Quoted(names));

    [Then(@"^la gestion de la liste des étiquettes est refusée car (.+)$")]
    public Task ThenTheManagementIsRefused(string reason)
    {
        var (status, code) = reason switch
        {
            "il faut être connecté" => (HttpStatusCode.Unauthorized, (string?)null),
            "seul un validateur ou un administrateur gère la liste des étiquettes" => (HttpStatusCode.Forbidden, "identity.capability-required"),
            "le compte n'existe plus et il faut se reconnecter" => (HttpStatusCode.Unauthorized, "identity.account-deleted"),
            _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Motif de refus inconnu."),
        };
        return ShouldBeAProblem(status, code);
    }

    [Then(@"^l'ajout de l'étiquette est impossible car (.+)$")]
    [Then(@"^le renommage de l'étiquette est impossible car (.+)$")]
    public Task ThenTheChangeIsImpossible(string reason)
    {
        var (status, code) = reason switch
        {
            "le nom de l'étiquette est obligatoire" => (HttpStatusCode.BadRequest, "tag.name-required"),
            "le nom de l'étiquette doit contenir une lettre ou un chiffre" => (HttpStatusCode.BadRequest, "tag.name-without-letter-or-digit"),
            "le nom de l'étiquette est trop long" => (HttpStatusCode.BadRequest, "tag.name-too-long"),
            "la description de l'étiquette est obligatoire" => (HttpStatusCode.BadRequest, "tag.description-required"),
            "la description de l'étiquette est trop longue" => (HttpStatusCode.BadRequest, "tag.description-too-long"),
            "une étiquette de ce nom existe déjà dans la liste" => (HttpStatusCode.Conflict, "catalog.tag-name-taken"),
            _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Motif d'impossibilité inconnu."),
        };
        return ShouldBeAProblem(status, code);
    }

    // --- Helpers ------------------------------------------------------------------------------

    /// <summary>The list after the last change, which must have succeeded.</summary>
    private async Task<IReadOnlyList<TagResponse>> Presented()
    {
        if (responses.Last is { } last) last.IsSuccessStatusCode.ShouldBeTrue(await last.Content.ReadAsStringAsync());
        return _consulted = await Consult();
    }

    private async Task<IReadOnlyList<TagResponse>> Consult()
    {
        using var visitor = deployment.Current.CreateClient();
        var response = await visitor.GetAsync(Tags);
        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<TagListResponse>())!.Tags;
    }

    private async Task<TagResponse> Find(string name) => (await Consult()).Single(t => t.Name == name);

    private static Uri TagUri(TagResponse tag) => new($"/catalog/tags/{tag.Id}", UriKind.Relative);

    private async Task ShouldBeAProblem(HttpStatusCode status, string? code)
    {
        var response = responses.Last.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(status, body);
        if (code is null) return;

        JsonSerializer.Deserialize<JsonElement>(body).GetProperty("title").GetString().ShouldBe(code);
    }

    /// <summary>« "vrille" » as typed, or « un nom de 31 caractères ».</summary>
    private static string NameOf(string name) =>
        name.StartsWith('"') ? name[1..^1] : OfLength(int.Parse(name.Split(' ')[3], System.Globalization.CultureInfo.InvariantCulture), 'v');

    private static string OfLength(int length, char filler) => new(filler, length);

    private static string DescriptionOf(string name) => $"Ce que veut dire « {name} ».";

    private static IReadOnlyList<string> Quoted(string names) =>
        [.. names.Split('"').Where((_, index) => index % 2 == 1)];

    // Black-box view of the HTTP contract (ADR 0034).
    private sealed record TagListResponse(IReadOnlyList<TagResponse> Tags);

    private sealed record TagResponse(Guid Id, string Name, string Description, Guid? ImpliedTagId, int TransitionCount);
}
