using System.Net.Http.Json;
using System.Text.RegularExpressions;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Catalog;

[Binding]
public sealed partial class CatalogPoseSteps(AcroFunJamApiFactory api, CatalogPublishing catalog, People people)
{
    private PoseListResponse? _consultedList;

    [Given("les poses publiées suivantes dans le catalogue :")]
    public async Task GivenThePublishedPoses(DataTable poses)
    {
        foreach (var row in poses.Rows)
        {
            await catalog.Publish(row["nom"], DifficultyLabels.ToCode(row["difficulté base"]), DifficultyLabels.ToCode(row["difficulté flyer"]));
        }
    }

    [Given("la pose publiée {string} de difficulté base {string} et de difficulté flyer {string}")]
    public Task GivenAPublishedPose(string name, string baseDifficulty, string flyerDifficulty) =>
        catalog.Publish(name, DifficultyLabels.ToCode(baseDifficulty), DifficultyLabels.ToCode(flyerDifficulty));

    [Given(@"^la pose publiée ""([^""]+)"" qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$")]
    public Task GivenAPublishedPoseWithFlowBoundaries(string name, string canStart, string canEnd) =>
        catalog.Publish(name, "discovery", "discovery", canStartFlow: canStart == "peut", canEndFlow: canEnd == "peut");

    [Given(@"^les poses publiées ((?:""[^""]+""(?:, | et )?)+) dans le catalogue$")]
    public async Task GivenThePublishedPosesNamed(string names)
    {
        foreach (var name in QuotedNames().Matches(names).Select(m => m.Groups[1].Value))
        {
            await catalog.Publish(name, "discovery", "discovery");
        }
    }

    [Given("un catalogue sans aucune pose publiée")]
    public static void GivenAnEmptyCatalog()
    {
        // Nothing is published: the scenario data starts empty.
    }

    [When("un visiteur consulte les poses du catalogue")]
    public async Task WhenAVisitorConsultsThePoses()
    {
        using var client = api.CreateClient();
        await Consult(client);
    }

    [When("{word} consulte les poses du catalogue")]
    public async Task WhenSomeoneConsultsThePoses(string name) => await Consult(await people.SignedInClient(name));

    private async Task Consult(HttpClient client)
    {
        var response = await client.GetAsync(new Uri("/catalog/poses", UriKind.Relative));
        response.EnsureSuccessStatusCode();
        _consultedList = await response.Content.ReadFromJsonAsync<PoseListResponse>();
    }

    [Then("la liste présente exactement les poses suivantes :")]
    public void ThenTheListContainsExactly(DataTable expected)
    {
        var expectedPoses = expected.Rows
            .Select(row => new PoseSummary(
                row["nom"],
                DifficultyLabels.ToCode(row["difficulté base"]),
                DifficultyLabels.ToCode(row["difficulté flyer"])))
            .ToList();

        // The order is specified by its own rule: compare regardless of order here.
        _consultedList.ShouldNotBeNull().Poses
            .Select(p => new PoseSummary(p.Name, p.BaseDifficulty, p.FlyerDifficulty))
            .ShouldBe(expectedPoses, ignoreOrder: true);
    }

    [Then("la pose {string} est présentée avec la difficulté base {string} et la difficulté flyer {string}")]
    public void ThenThePoseIsPresentedWith(string name, string baseDifficulty, string flyerDifficulty)
    {
        var pose = _consultedList.ShouldNotBeNull().Poses.Where(p => p.Name == name).ShouldHaveSingleItem();
        pose.BaseDifficulty.ShouldBe(DifficultyLabels.ToCode(baseDifficulty));
        pose.FlyerDifficulty.ShouldBe(DifficultyLabels.ToCode(flyerDifficulty));
    }

    [Then(@"^la pose ""([^""]+)"" est présentée comme une pose qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$")]
    public void ThenThePoseIsPresentedWithFlowBoundaries(string name, string canStart, string canEnd)
    {
        var pose = _consultedList.ShouldNotBeNull().Poses.Where(p => p.Name == name).ShouldHaveSingleItem();
        pose.CanStartFlow.ShouldBe(canStart == "peut");
        pose.CanEndFlow.ShouldBe(canEnd == "peut");
    }

    [Then("les poses sont présentées dans cet ordre :")]
    public void ThenThePosesArePresentedInOrder(DataTable expected) =>
        _consultedList.ShouldNotBeNull().Poses.Select(p => p.Name)
            .ShouldBe(expected.Rows.Select(row => row["nom"]));

    [Then("le visiteur est informé que le catalogue ne contient encore aucune pose")]
    public void ThenTheVisitorIsToldTheCatalogIsEmpty()
    {
        // Through the API, the catalog is empty: the message itself is the front's concern (ADR 0007).
        _consultedList.ShouldNotBeNull().Poses.ShouldBeEmpty();
    }

    [GeneratedRegex("\"([^\"]+)\"")]
    private static partial Regex QuotedNames();

    // Black-box view of the HTTP contract (deliberately not the Api types). The indicators are nullable so that
    // a missing field fails the comparison instead of reading as false.
    private sealed record PoseListResponse(IReadOnlyList<PoseSummaryResponse> Poses);

    private sealed record PoseSummaryResponse(string Name, string BaseDifficulty, string FlyerDifficulty, bool? CanStartFlow, bool? CanEndFlow);

    private sealed record PoseSummary(string Name, string BaseDifficulty, string FlyerDifficulty);
}
