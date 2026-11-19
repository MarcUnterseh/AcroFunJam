using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.FlowGeneration;

/// <summary>
/// Story 9: a visitor generates a flow (POST /flow-generation/flows, ADR 0037). Unless the step says otherwise, the poses and the
/// transitions are « débutant » for the base and the flyer, and the generation restricts neither the difficulty (« avancé » at most)
/// nor the tags.
/// </summary>
[Binding]
public sealed partial class FlowGenerationSteps(Deployment deployment, CatalogPublishing catalog)
{
    private const string Quoted = @"((?:""[^""]+""(?:, | et | ou )?)+)";

    private readonly Dictionary<string, Guid> _tagIdsSent = new(StringComparer.Ordinal);
    private HttpResponseMessage? _response;
    private FlowResponse? _flow;

    // --- Set-up ---------------------------------------------------------------------------------

    [Given(@"^les poses publiées " + Quoted + " dans le catalogue, qui peuvent commencer et terminer un flow$")]
    public async Task GivenPublishedPosesThatCanStartAndEndAFlow(string names)
    {
        foreach (var name in TagNames.In(names)) await catalog.Publish(name, "beginner", "beginner");
    }

    /// <summary>The description is written straight into catalog.transitions: no use case changes a published transition yet.</summary>
    [Given(@"^la transition ""([^""]+)"" a pour description ""([^""]*)""$")]
    public async Task GivenTheTransitionHasTheDescription(string name, string description)
    {
        using var scope = deployment.Current.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AcroFunJamDbContext>();
        var updated = await context.Set<TransitionRecord>().Where(t => t.Name == name)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.Description, description));
        updated.ShouldBe(1);
    }

    // --- Generating -----------------------------------------------------------------------------

    /// <summary>The criteria after the length (Reqnroll binds every group: the tail is parsed by <see cref="Criteria"/>).</summary>
    [When(@"^un visiteur génère un flow de (\d+) transitions?((?!.*sur le site)[, ].*|)$")]
    public async Task WhenAVisitorGeneratesAFlow(int length, string criteria)
    {
        var match = Criteria().Match(criteria);
        match.Success.ShouldBeTrue($"critères non reconnus : {criteria}");
        var baseCeiling = match.Groups["base"];
        await Generate(
            length,
            baseCeiling.Success ? DifficultyLabels.ToCodeOrAsIs(baseCeiling.Value) : "advanced",
            match.Groups["noFlyer"].Success ? null : baseCeiling.Success ? DifficultyLabels.ToCodeOrAsIs(match.Groups["flyer"].Value) : "advanced",
            match.Groups["requested"].Success ? TagNames.In(match.Groups["requested"].Value) : [],
            match.Groups["excluded"].Success ? [match.Groups["excluded"].Value] : []);
    }

    [When("un visiteur génère un flow sans en préciser la longueur")]
    public Task WhenAVisitorGeneratesAFlowWithoutLength() => Generate(null, "advanced", "advanced", [], []);

    private async Task Generate(int? length, string? baseCeiling, string? flyerCeiling, IReadOnlyList<string> requested, IReadOnlyList<string> excluded)
    {
        using var visitor = deployment.Current.CreateClient();
        var requestedIds = await IdsOf(visitor, requested);
        var excludedIds = await IdsOf(visitor, excluded);
        _response = await visitor.PostAsJsonAsync(
            new Uri("/flow-generation/flows", UriKind.Relative),
            new { length, baseDifficultyCeiling = baseCeiling, flyerDifficultyCeiling = flyerCeiling, requestedTagIds = requestedIds, excludedTagIds = excludedIds });
        _flow = _response.IsSuccessStatusCode ? await _response.Content.ReadFromJsonAsync<FlowResponse>() : null;
    }

    /// <summary>The same name gets the same identifier in a request (a tag requested and excluded at once); an unknown name a new one.</summary>
    private async Task<IReadOnlyList<Guid>> IdsOf(HttpClient client, IReadOnlyList<string> names)
    {
        var ids = await TagNames.IdsOf(client, names);
        return [.. names.Zip(ids, (name, id) => _tagIdsSent.TryAdd(name, id.Value) ? id.Value : _tagIdsSent[name])];
    }

    // --- The flow -------------------------------------------------------------------------------

    private FlowResponse Flow => _flow.ShouldNotBeNull($"no flow: {_response?.StatusCode} {_response?.Content.ReadAsStringAsync().Result}");

    /// <summary>« Throne → Bird → Folded Leaf »: the start pose, then the arrival pose of each step.</summary>
    private static string PathOf(FlowResponse flow) => string.Join(" → ", flow.Steps.Select(s => s.Arrival.Name).Prepend(flow.Start.Name));

    [Then(@"^le flow généré est « ([^«»]+) »$")]
    public void ThenTheFlowIs(string path) => PathOf(Flow).ShouldBe(path);

    [Then(@"^le flow généré est « ([^«»]+) », par la transition « ([^«»]+) »$")]
    public void ThenTheFlowIsByTheTransition(string path, string transition)
    {
        PathOf(Flow).ShouldBe(path);
        Flow.Steps.ShouldHaveSingleItem().Transition.Name.ShouldBe(transition);
    }

    [Then(@"^le flow généré est « ([^«»]+) », par la transition sans nom$")]
    public void ThenTheFlowIsByTheUnnamedTransition(string path)
    {
        PathOf(Flow).ShouldBe(path);
        Flow.Steps.ShouldHaveSingleItem().Transition.Name.ShouldBeNull();
    }

    [Then("le flow généré est l'un des suivants :")]
    public void ThenTheFlowIsOneOf(DataTable flows) => flows.Rows.Select(row => row["flow"]).ShouldContain(PathOf(Flow));

    [Then("le flow généré présente les étapes suivantes :")]
    public void ThenTheFlowPresentsTheSteps(DataTable steps)
    {
        Flow.Steps.Select((step, index) => new
        {
            step = step.Number.ToString(System.Globalization.CultureInfo.InvariantCulture),
            from = index == 0 ? Flow.Start.Name : Flow.Steps[index - 1].Arrival.Name,
            transition = step.Transition.Name ?? "",
            to = step.Arrival.Name,
            @base = DifficultyLabels.ToLabelOrAsIs(step.Transition.BaseDifficulty),
            flyer = DifficultyLabels.ToLabelOrAsIs(step.Transition.FlyerDifficulty),
            tags = string.Join(", ", step.Transition.Tags.Select(t => t.Name)),
        }).ShouldBe(steps.Rows.Select(row => new
        {
            step = row["étape"],
            from = row["pose de départ"],
            transition = row["transition"],
            to = row["pose d'arrivée"],
            @base = row["difficulté base"],
            flyer = row["difficulté flyer"],
            tags = row["étiquettes"],
        }));
    }

    [Then("le flow généré présente les poses suivantes :")]
    public void ThenTheFlowPresentsThePoses(DataTable poses)
    {
        foreach (var row in poses.Rows)
        {
            var pose = row["place"] == "départ" ? Flow.Start : Flow.Steps[int.Parse(ArrivalStep().Match(row["place"]).Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture) - 1].Arrival;
            new
            {
                pose.Name,
                Base = DifficultyLabels.ToLabelOrAsIs(pose.BaseDifficulty),
                Flyer = DifficultyLabels.ToLabelOrAsIs(pose.FlyerDifficulty),
                Tags = string.Join(", ", pose.Tags.Select(t => t.Name)),
            }.ShouldBe(new { Name = row["pose"], Base = row["difficulté base"], Flyer = row["difficulté flyer"], Tags = row["étiquettes"] });
        }
    }

    [Then(@"^l'étape (\d+) du flow généré présente la description « (.+) »$")]
    public void ThenTheStepPresentsTheDescription(int step, string description) => Flow.Steps[step - 1].Transition.Description.ShouldBe(description);

    // --- Refusals -------------------------------------------------------------------------------

    private async Task ThenTheGenerationFails(HttpStatusCode status, string code)
    {
        _response.ShouldNotBeNull();
        var body = await _response.Content.ReadAsStringAsync();
        _response.StatusCode.ShouldBe(status, body);
        JsonDocument.Parse(body).RootElement.GetProperty("title").GetString().ShouldBe(code);
    }

    [Then("aucun flow n'est généré car les critères sont trop restrictifs")]
    public Task ThenTheCriteriaAreTooRestrictive() =>
        ThenTheGenerationFails(HttpStatusCode.UnprocessableEntity, "flow-generation.criteria-too-restrictive");

    [Then("aucun flow n'est généré car le catalogue ne permet pas encore d'en générer")]
    public Task ThenTheCatalogIsInsufficient() => ThenTheGenerationFails(HttpStatusCode.UnprocessableEntity, "flow-generation.catalog-insufficient");

    [Then("la génération est impossible car la longueur doit être comprise entre 1 et 10 transitions")]
    public Task ThenTheLengthIsOutOfRange() => ThenTheGenerationFails(HttpStatusCode.BadRequest, "flow-generation.length-out-of-range");

    [Then("la génération est impossible car la longueur est obligatoire")]
    public Task ThenTheLengthIsRequired() => ThenTheGenerationFails(HttpStatusCode.BadRequest, "flow-generation.length-required");

    [Then("la génération est impossible car le plafond de difficulté flyer est obligatoire")]
    public Task ThenTheFlyerCeilingIsRequired() =>
        ThenTheGenerationFails(HttpStatusCode.BadRequest, "flow-generation.flyer-difficulty-ceiling-required");

    [Then(@"^la génération est impossible car le niveau de difficulté « (.+) » n'existe pas$")]
    public Task ThenTheLevelDoesNotExist(string _) => ThenTheGenerationFails(HttpStatusCode.BadRequest, "pose.unknown-difficulty-level");

    [Then(@"^la génération est impossible car l'étiquette ""([^""]+)"" n'est pas dans la liste des étiquettes$")]
    public async Task ThenTheTagIsNotInTheList(string tag)
    {
        await ThenTheGenerationFails(HttpStatusCode.Conflict, "flow-generation.tag-not-in-list");
        var body = JsonDocument.Parse(await _response!.Content.ReadAsStringAsync()).RootElement;
        body.GetProperty("tagIds").EnumerateArray().Select(id => id.GetGuid()).ShouldBe([_tagIdsSent[tag]]);
    }

    [GeneratedRegex(@"^(?:, de difficulté base ""(?<base>[^""]*)"" au plus(?: et de difficulté flyer ""(?<flyer>[^""]*)"" au plus|(?<noFlyer>, sans plafond de difficulté flyer)))?"
        + @"(?: avec l'une des étiquettes (?<requested>(?:""[^""]+""(?: ou )?)+))?(?: et)?(?: sans l'étiquette ""(?<excluded>[^""]+)"")?$")]
    private static partial Regex Criteria();

    [GeneratedRegex(@"^arrivée de l'étape (\d+)$")]
    private static partial Regex ArrivalStep();

    private sealed record TagResponse(Guid Id, string Name);

    private sealed record PoseResponse(Guid Id, string Name, string BaseDifficulty, string FlyerDifficulty, IReadOnlyList<TagResponse> Tags);

    private sealed record TransitionResponse(
        Guid Id, string? Name, string BaseDifficulty, string FlyerDifficulty, string? Description, IReadOnlyList<TagResponse> Tags);

    private sealed record StepResponse(int Number, TransitionResponse Transition, bool IsWashingMachine, PoseResponse Arrival);

    private sealed record FlowResponse(PoseResponse Start, IReadOnlyList<StepResponse> Steps);
}
