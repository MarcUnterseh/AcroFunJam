using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Contribution;
using AcroFunJam.Specs.Support.Identity;
using Npgsql;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Contribution;

/// <summary>
/// Story 8: the tags of a proposed transition (ADR 0033, ADR 0034), sent by identifier, read back under their current names in the
/// answer, the validation queue and « Mes propositions »; the proposed and retained sets are observed in the database.
/// </summary>
[Binding]
public sealed class TransitionProposalTagSteps(
    People people, Deployment deployment, ScenarioResponses responses, ScenarioTransitionProposals proposals, ScenarioDecisions decisions,
    Consultation consultation)
{
    private const string Proposed = @"(la transition ""[^""]*""|une transition sans nom)";
    private const string Designated = @"(la transition ""[^""]*""|la transition sans nom)";
    private const string Poses = @"de ""([^""]*)"" vers ""([^""]*)""";
    private const string Difficulties = @"de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)""";
    private const string Tags = @"((?:""[^""]+""(?:, | et )?)+)";
    private const string WithTags = ", avec (?:l'étiquette|les étiquettes) " + Tags;

    // --- Proposing ----------------------------------------------------------------------------

    [When(@"^(\w+) propose " + Proposed + " " + Poses + WithTags + "$")]
    public async Task WhenSomeoneProposesWithTags(string person, string transition, string from, string to, string tags) =>
        responses.Last = await Propose(person, transition, from, to, "beginner", "beginner", TagNames.In(tags));

    [Given(@"^(\w+) a proposé " + Proposed + " " + Poses + WithTags + "$")]
    public async Task GivenSomeoneHasProposedWithTags(string person, string transition, string from, string to, string tags)
    {
        await WhenSomeoneProposesWithTags(person, transition, from, to, tags);
        await ShouldBeReceived();
    }

    [Given(@"^(\w+) a proposé " + Proposed + " " + Poses + " " + Difficulties + WithTags + "$")]
    public async Task GivenSomeoneHasProposedWithDifficultiesAndTags(
        string person, string transition, string from, string to, string baseDifficulty, string flyerDifficulty, string tags)
    {
        responses.Last = await Propose(
            person, transition, from, to, DifficultyLabels.ToCode(baseDifficulty), DifficultyLabels.ToCode(flyerDifficulty), TagNames.In(tags));
        await ShouldBeReceived();
    }

    [Then("^la proposition de " + Designated + " " + Poses + @" par (\w+) porte exactement les étiquettes " + Tags + "$")]
    public async Task ThenTheProposalCarriesExactly(string transition, string from, string to, string person, string tags) =>
        (await ShouldBeReceived()).Tags.Select(t => t.Name).ShouldBe(TagNames.In(tags));

    [Then("^la proposition de " + Designated + " " + Poses + @" par (\w+) ne porte aucune étiquette$")]
    public async Task ThenTheProposalCarriesNoTag(string transition, string from, string to, string person) =>
        (await ShouldBeReceived()).Tags.ShouldBeEmpty();

    // --- Deciding -----------------------------------------------------------------------------

    /// <summary>« la proposition garde les étiquettes proposées "dynamique, inversion, pop" et les étiquettes retenues "…" », or "aucune".</summary>
    [Then(@"^la proposition garde les étiquettes proposées ""([^""]*)"" et les étiquettes retenues ""([^""]*)""$")]
    public async Task ThenTheProposalKeepsBothSets(string proposed, string retained)
    {
        // Story 9a: the last acceptance may be on a pose proposal.
        var (id, table) = decisions.OnPose is { } pose ? (pose, "pose_proposals") : (decisions.OnTransition.ShouldNotBeNull(), "transition_proposals");
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            $"SELECT proposed_tag_ids, retained_tag_ids FROM contribution.{table} WHERE id = @id", connection);
        command.Parameters.AddWithValue("id", id);
        await using var reader = await command.ExecuteReaderAsync();
        (await reader.ReadAsync()).ShouldBeTrue();
        var names = await TagNamesById();
        string Named(Guid[] ids) => ids.Length == 0 ? "aucune" : string.Join(", ", ids.Select(t => names[t]).Order(StringComparer.Ordinal));
        Named(reader.GetFieldValue<Guid[]>(0)).ShouldBe(proposed);
        Named(reader.GetFieldValue<Guid[]>(1)).ShouldBe(retained);
    }

    // --- Presenting ---------------------------------------------------------------------------

    [Then("^la file de validation présente " + Designated + " " + Poses + " avec les étiquettes " + Tags + "$")]
    public async Task ThenTheQueuePresentsTheTags(string transition, string from, string to, string tags) =>
        TagsOf(await Transition("proposals", transition, from, to)).ShouldBe(TagNames.In(tags));

    [Then("^ses propositions présentent " + Designated + " " + Poses + " avec les étiquettes " + Tags + "$")]
    public async Task ThenMyProposalsPresentTheTags(string transition, string from, string to, string tags) =>
        TagsOf(await Transition("proposals", transition, from, to)).ShouldBe(TagNames.In(tags));

    [Then("^" + Designated + " " + Poses + " présente l'ajustement des étiquettes « (.*) » → « (.*) »$")]
    public async Task ThenTheTransitionPresentsTheTagsAdjustment(string transition, string from, string to, string proposed, string retained)
    {
        var mine = await Transition("proposals", transition, from, to);
        mine.GetProperty("status").GetString().ShouldBe("accepted-with-adjustments");
        var adjustment = mine.GetProperty("adjustments").GetProperty("tags");
        string Joined(JsonElement tags) => string.Join(", ", tags.EnumerateArray().Select(t => t.GetProperty("name").GetString()));
        Joined(adjustment.GetProperty("proposed")).ShouldBe(proposed);
        Joined(adjustment.GetProperty("retained")).ShouldBe(retained);
    }

    // --- HTTP ---------------------------------------------------------------------------------

    private async Task<HttpResponseMessage> Propose(
        string person, string transition, string from, string to, string baseDifficulty, string flyerDifficulty, IReadOnlyList<string> tags)
    {
        var client = await people.SignedInClient(person);
        var poses = await client.GetFromJsonAsync<PoseList>(new Uri("/catalog/poses", UriKind.Relative));
        var name = NameIn(transition);
        var request = new
        {
            fromPoseId = poses!.Poses.Single(p => p.Name == from).Id,
            toPoseId = poses.Poses.Single(p => p.Name == to).Id,
            name,
            baseDifficulty,
            flyerDifficulty,
            tagIds = (await TagNames.IdsOf(client, tags)).Select(t => t.Value),
        };
        var response = await client.PostAsJsonAsync(new Uri("/contribution/transition-proposals", UriKind.Relative), request);
        if (response.StatusCode == HttpStatusCode.Created)
        {
            var received = JsonSerializer.Deserialize<Received>(await response.Content.ReadAsStringAsync(), JsonSerializerOptions.Web)!;
            proposals.Received(person, from, to, name, received.Id);
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

    /// <summary>The transition of the last consultation (the queue, or « Mes propositions »), by its poses and its name.</summary>
    private async Task<JsonElement> Transition(string list, string transition, string from, string to)
    {
        var response = consultation.Response.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        var name = NameIn(transition);
        return JsonSerializer.Deserialize<JsonElement>(body).GetProperty(list).EnumerateArray()
            .Where(p => p.GetProperty("kind").GetString() == "transition-proposal")
            .Where(p => p.GetProperty("fromPose").GetProperty("name").GetString() == from && p.GetProperty("toPose").GetProperty("name").GetString() == to)
            .Where(p => p.GetProperty("name").GetString() == name)
            .ShouldHaveSingleItem();
    }

    private static IReadOnlyList<string?> TagsOf(JsonElement transition) =>
        [.. transition.GetProperty("tags").EnumerateArray().Select(t => t.GetProperty("name").GetString())];

    private async Task<IReadOnlyDictionary<Guid, string>> TagNamesById()
    {
        using var visitor = deployment.Current.CreateClient();
        var list = await visitor.GetFromJsonAsync<TagList>(new Uri("/catalog/tags", UriKind.Relative));
        return list!.Tags.ToDictionary(t => t.Id, t => t.Name);
    }

    private static string? NameIn(string designation) =>
        designation.EndsWith("sans nom", StringComparison.Ordinal) ? null : designation.Split('"')[1];

    private sealed record PoseList(IReadOnlyList<Item> Poses);

    private sealed record Item(Guid Id, string Name);

    private sealed record Received(Guid Id, IReadOnlyList<Item> Tags);

    private sealed record TagList(IReadOnlyList<Item> Tags);
}
