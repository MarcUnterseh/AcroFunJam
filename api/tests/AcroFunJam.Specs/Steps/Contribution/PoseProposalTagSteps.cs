using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Contribution;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Contribution;

/// <summary>
/// Story 9a: the tags of a proposed pose (ADR 0036), sent by identifier, read back under their current names in the answer, the
/// validation queue and « Mes propositions ».
/// </summary>
[Binding]
public sealed class PoseProposalTagSteps(People people, ScenarioResponses responses, ScenarioProposals proposals, Consultation consultation)
{
    private static readonly Uri PoseProposals = new("/contribution/pose-proposals", UriKind.Relative);
    private const string Tags = @"((?:""[^""]+""(?:, | et )?)+)";
    private const string WithTags = ", avec (?:l'étiquette|les étiquettes) " + Tags;

    // --- Proposing ----------------------------------------------------------------------------

    [When(@"^(\w+) propose la pose ""([^""]*)""" + WithTags + "$")]
    public async Task WhenSomeoneProposesWithTags(string person, string pose, string tags) =>
        responses.Last = await Propose(person, pose, TagNames.In(tags));

    [Given(@"^(\w+) a proposé la pose ""([^""]*)""" + WithTags + "$")]
    public async Task GivenSomeoneHasProposedWithTags(string person, string pose, string tags)
    {
        await WhenSomeoneProposesWithTags(person, pose, tags);
        await ShouldBeReceived();
    }

    [Then(@"^la proposition de la pose ""([^""]*)"" par (\w+) porte exactement les étiquettes " + Tags + "$")]
    public async Task ThenTheProposalCarriesExactly(string pose, string person, string tags) =>
        (await ShouldBeReceived()).Tags.Select(t => t.Name).ShouldBe(TagNames.In(tags));

    [Then(@"^la proposition de la pose ""([^""]*)"" par (\w+) ne porte aucune étiquette$")]
    public async Task ThenTheProposalCarriesNoTag(string pose, string person) => (await ShouldBeReceived()).Tags.ShouldBeEmpty();

    // --- Presenting ---------------------------------------------------------------------------

    [Then(@"^la file de validation présente la proposition de la pose ""([^""]*)"" par (\w+) avec les étiquettes " + Tags + "$")]
    public async Task ThenTheQueuePresentsTheTags(string pose, string person, string tags) =>
        TagsOf(await Pose(pose)).ShouldBe(TagNames.In(tags));

    [Then(@"^ses propositions présentent la pose ""([^""]*)"" avec les étiquettes " + Tags + "$")]
    public async Task ThenMyProposalsPresentTheTags(string pose, string tags) => TagsOf(await Pose(pose)).ShouldBe(TagNames.In(tags));

    [Then(@"^la pose ""([^""]*)"" présente l'ajustement des étiquettes « (.*) » → « (.*) »$")]
    public async Task ThenThePosePresentsTheTagsAdjustment(string pose, string proposed, string retained)
    {
        var mine = await Pose(pose);
        mine.GetProperty("status").GetString().ShouldBe("accepted-with-adjustments");
        var adjustment = mine.GetProperty("adjustments").GetProperty("tags");
        string Joined(JsonElement tags) => string.Join(", ", tags.EnumerateArray().Select(t => t.GetProperty("name").GetString()));
        Joined(adjustment.GetProperty("proposed")).ShouldBe(proposed);
        Joined(adjustment.GetProperty("retained")).ShouldBe(retained);
    }

    // --- HTTP ---------------------------------------------------------------------------------

    private async Task<HttpResponseMessage> Propose(string person, string pose, IReadOnlyList<string> tags)
    {
        var client = await people.SignedInClient(person);
        var request = new
        {
            name = pose,
            baseDifficulty = "beginner",
            flyerDifficulty = "discovery",
            canStartFlow = true,
            canEndFlow = true,
            tagIds = (await TagNames.IdsOf(client, tags)).Select(t => t.Value),
        };
        var response = await client.PostAsJsonAsync(PoseProposals, request);
        if (response.StatusCode == HttpStatusCode.Created)
        {
            var received = JsonSerializer.Deserialize<Received>(await response.Content.ReadAsStringAsync(), JsonSerializerOptions.Web)!;
            proposals.Received(person, pose, received.Id);
        }

        return response;
    }

    private async Task<Received> ShouldBeReceived()
    {
        var response = responses.Last.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.Created, body);
        return JsonSerializer.Deserialize<Received>(body, JsonSerializerOptions.Web)!;
    }

    /// <summary>The proposed pose of the last consultation (the queue, or « Mes propositions »), by its name.</summary>
    private async Task<JsonElement> Pose(string pose)
    {
        var response = consultation.Response.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        return JsonSerializer.Deserialize<JsonElement>(body).GetProperty("proposals").EnumerateArray()
            .Where(p => p.GetProperty("kind").GetString() == "pose-proposal")
            .Where(p => p.GetProperty("name").GetString() == pose)
            .ShouldHaveSingleItem();
    }

    private static IReadOnlyList<string?> TagsOf(JsonElement pose) =>
        [.. pose.GetProperty("tags").EnumerateArray().Select(t => t.GetProperty("name").GetString())];

    private sealed record Tag(Guid Id, string Name);

    private sealed record Received(Guid Id, IReadOnlyList<Tag> Tags);
}
