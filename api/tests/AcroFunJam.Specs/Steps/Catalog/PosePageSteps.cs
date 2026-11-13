using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Catalog;

/// <summary>
/// Story 7: the page of a published pose, with its transitions from and to it (ADR 0030), and the transitions published by a
/// « Soit » step through the PublishTransition command (ADR 0020).
/// </summary>
[Binding]
public sealed class PosePageSteps(Deployment deployment, People people, CatalogPublishing catalog)
{
    private const string Transition = @"(sans nom|""[^""]*"")";
    private const string Poses = @"de ""([^""]*)"" vers ""([^""]*)""";
    private const string Difficulties = @"de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)""";

    private HttpResponseMessage? _response;

    // --- Publishing ---------------------------------------------------------------------------

    [Given("les transitions publiées suivantes dans le catalogue :")]
    public async Task GivenThePublishedTransitions(DataTable transitions)
    {
        foreach (var row in transitions.Rows)
        {
            await catalog.PublishTransition(
                row["pose de départ"], row["pose d'arrivée"], Blank(row["nom"]),
                DifficultyLabels.ToCode(row["difficulté base"]), DifficultyLabels.ToCode(row["difficulté flyer"]), Blank(row["description"]));
        }
    }

    [Given(@"^la transition publiée " + Transition + " " + Poses + " " + Difficulties + "$")]
    public Task GivenAPublishedTransition(string transition, string from, string to, string baseDifficulty, string flyerDifficulty) =>
        catalog.PublishTransition(from, to, NameIn(transition), DifficultyLabels.ToCode(baseDifficulty), DifficultyLabels.ToCode(flyerDifficulty), description: null);

    /// <summary>Without difficulties in the step: beginner for both, as « Quand Alice propose … » (story 7).</summary>
    [Given(@"^la transition publiée " + Transition + " " + Poses + "$")]
    public Task GivenAPublishedTransitionBetween(string transition, string from, string to) =>
        catalog.PublishTransition(from, to, NameIn(transition), "beginner", "beginner", description: null);

    [Given(@"^la transition publiée " + Transition + " " + Poses + " " + Difficulties + @", avec la description « ?(.*?) ?»$")]
    public Task GivenAPublishedTransitionWithADescription(
        string transition, string from, string to, string baseDifficulty, string flyerDifficulty, string description) =>
        catalog.PublishTransition(from, to, NameIn(transition), DifficultyLabels.ToCode(baseDifficulty), DifficultyLabels.ToCode(flyerDifficulty), description);

    // --- Consulting ---------------------------------------------------------------------------

    [When(@"^un visiteur consulte la pose ""([^""]*)"" du catalogue$")]
    public async Task WhenAVisitorConsultsThePose(string pose)
    {
        using var visitor = deployment.Current.CreateClient();
        await Consult(visitor, pose);
    }

    [When(@"^(\w+) consulte la pose ""([^""]*)"" du catalogue$")]
    public async Task WhenSomeoneConsultsThePose(string name, string pose) => await Consult(await people.SignedInClient(name), pose);

    [When("un visiteur consulte une pose qui n'existe pas dans le catalogue")]
    public async Task WhenAVisitorConsultsAnUnknownPose()
    {
        using var visitor = deployment.Current.CreateClient();
        _response = await visitor.GetAsync(new Uri($"/catalog/poses/{Guid.NewGuid()}", UriKind.Relative));
    }

    private async Task Consult(HttpClient client, string pose)
    {
        var list = await client.GetFromJsonAsync<PoseListResponse>(new Uri("/catalog/poses", UriKind.Relative));
        var id = list!.Poses.Single(p => p.Name == pose).Id;
        _response = await client.GetAsync(new Uri($"/catalog/poses/{id}", UriKind.Relative));
    }

    // --- Outcome ------------------------------------------------------------------------------

    [Then(@"^les transitions (depuis|vers) la pose ""([^""]*)"" sont exactement :$")]
    public async Task ThenTheTransitionsAreExactly(string direction, string pose, DataTable expected)
    {
        var other = direction == "depuis" ? "pose d'arrivée" : "pose de départ";
        var presented = await Transitions(direction, pose);
        presented.Select(t => new Presented(t.OtherPose.Name, t.Name, t.BaseDifficulty, t.FlyerDifficulty, t.Description))
            .ShouldBe(expected.Rows.Select(row => new Presented(
                row[other], Blank(row["nom"]), DifficultyLabels.ToCode(row["difficulté base"]), DifficultyLabels.ToCode(row["difficulté flyer"]),
                row.ContainsKey("description") ? Blank(row["description"]) : null)));
    }

    [Then(@"^les transitions (depuis|vers) la pose ""([^""]*)"" sont présentées dans cet ordre :$")]
    public async Task ThenTheTransitionsArePresentedInOrder(string direction, string pose, DataTable expected)
    {
        var other = direction == "depuis" ? "pose d'arrivée" : "pose de départ";
        (await Transitions(direction, pose)).Select(t => (t.OtherPose.Name, t.Name))
            .ShouldBe(expected.Rows.Select(row => (row[other], Blank(row["nom"]))));
    }

    [Then(@"^aucune transition n'est présentée (depuis|vers) la pose ""([^""]*)""$")]
    public async Task ThenNoTransitionIsPresented(string direction, string pose) =>
        (await Transitions(direction, pose)).ShouldBeEmpty();

    [Then(@"^les transitions (depuis|vers) la pose ""([^""]*)"" présentent ""([^""]*)"" (?:vers|depuis) ""([^""]*)""$")]
    public async Task ThenTheTransitionsPresent(string direction, string pose, string transition, string otherPose)
    {
        var page = await Page();
        var presented = (await Transitions(direction, pose)).Where(t => t.Name == transition).ShouldHaveSingleItem();
        presented.OtherPose.Name.ShouldBe(otherPose);
        if (otherPose == pose) presented.OtherPose.Id.ShouldBe(page.Id); // a washing machine: the same pose
    }

    [Then("la pose est introuvable dans le catalogue")]
    public async Task ThenThePoseIsNotFound()
    {
        var response = _response.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound, body);
        JsonSerializer.Deserialize<JsonElement>(body).GetProperty("title").GetString().ShouldBe("catalog.pose-not-found");
    }

    private async Task<IReadOnlyList<LinkedTransitionResponse>> Transitions(string direction, string pose)
    {
        var page = await Page();
        page.Name.ShouldBe(pose);
        return direction == "depuis" ? page.TransitionsFrom : page.TransitionsTo;
    }

    private async Task<PosePageResponse> Page()
    {
        var response = _response.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        return JsonSerializer.Deserialize<PosePageResponse>(body, JsonSerializerOptions.Web)!;
    }

    private static string? NameIn(string transition) => transition == "sans nom" ? null : transition.Trim('"');

    private static string? Blank(string value) => string.IsNullOrWhiteSpace(value) ? null : value;

    // Black-box view of the HTTP contract (deliberately not the Api types).
    private sealed record PoseListResponse(IReadOnlyList<PoseSummaryResponse> Poses);

    private sealed record PoseSummaryResponse(Guid Id, string Name);

    private sealed record PoseReference(Guid Id, string Name);

    private sealed record LinkedTransitionResponse(
        Guid Id, PoseReference OtherPose, string? Name, string BaseDifficulty, string FlyerDifficulty, string? Description);

    private sealed record PosePageResponse(
        Guid Id, string Name, IReadOnlyList<LinkedTransitionResponse> TransitionsFrom, IReadOnlyList<LinkedTransitionResponse> TransitionsTo);

    private sealed record Presented(string OtherPose, string? Name, string BaseDifficulty, string FlyerDifficulty, string? Description);
}
