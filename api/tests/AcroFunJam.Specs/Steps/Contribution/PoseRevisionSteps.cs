using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Contribution;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Contribution;

/// <summary>
/// Story 6 « Proposer une modification d'une pose publiée » through the HTTP contract (ADR 0024 to 0027): the steps read
/// the pose and its version as the website does, then send only the changed field.
/// </summary>
[Binding]
public sealed partial class PoseRevisionSteps(
    People people, Deployment deployment, ScenarioPoseRevisions revisions, ScenarioResponses responses, ScenarioDecisions decisions, ScenarioClock clock,
    Consultation consultation)
{
    private const string Revision = @"la proposition de modification de la pose ""([^""]*)"" par (\w+)";
    private const string Reason = @"« ?(.*?) ?»";
    private const string Day = @"(\d{4}-\d{2}-\d{2})";

    private static readonly Uri PoseRevisionProposals = new("/contribution/pose-revision-proposals", UriKind.Relative);

    // --- Proposing ----------------------------------------------------------------------------

    [When(@"^(\w+) propose de modifier la pose ""([^""]*)"" en changeant (.+)$")]
    public async Task WhenSomeoneProposesToRevise(string name, string pose, string change) =>
        responses.Last = await ProposeRevision(name, pose, change);

    [Given(@"^(\w+) a proposé de modifier la pose ""([^""]*)"" en retirant (toutes ses étiquettes)$")]
    [Given(@"^(\w+) a proposé de modifier la pose ""([^""]*)"" en changeant (.+)$")]
    public async Task GivenSomeoneHasProposedToRevise(string name, string pose, string change)
    {
        await WhenSomeoneProposesToRevise(name, pose, change);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.Created, await responses.Last.Content.ReadAsStringAsync());
    }

    [When(@"^un visiteur propose de modifier la pose ""([^""]*)"" en changeant (.+)$")]
    public async Task WhenAVisitorProposesToRevise(string pose, string change)
    {
        using var visitor = deployment.Current.CreateClient();
        var current = await ReadPublishedPose(visitor, pose);
        responses.Last = await visitor.PostAsJsonAsync(PoseRevisionProposals, WithChange(new RevisionRequest(current.Id, current.Version), change));
    }

    [When(@"^(\w+) propose de modifier une pose qui n'existe pas dans le catalogue$")]
    public async Task WhenSomeoneProposesToReviseAnUnknownPose(string name)
    {
        var client = await people.SignedInClient(name);
        responses.Last = await client.PostAsJsonAsync(
            PoseRevisionProposals, WithChange(new RevisionRequest(Guid.NewGuid(), PoseVersion: 1), "la difficulté flyer en \"découverte\""));
    }

    // --- Deciding -----------------------------------------------------------------------------

    [When(@"^(\w+) accepte " + Revision + "$")]
    public async Task WhenSomeoneAccepts(string name, string pose, string contributor) =>
        decisions.OnRevisionProposal(await Accept(name, pose, contributor, new ValidationSteps.AcceptanceRequest()));

    [When(@"^(\w+) accepte le " + Day + " " + Revision + "$")]
    public async Task WhenSomeoneAcceptsOn(string name, string day, string pose, string contributor)
    {
        clock.SetUtcNow(ScenarioClock.Parse(day));
        await WhenSomeoneAccepts(name, pose, contributor);
    }

    [When(@"^(\w+) accepte " + Revision + " en corrigeant ([^,]+)$")]
    public async Task WhenSomeoneAcceptsWithAnAdjustment(string name, string pose, string contributor, string adjustment) =>
        decisions.OnRevisionProposal(await Accept(name, pose, contributor, ValidationSteps.Adjusting(adjustment)));

    [Given(@"^(\w+) a accepté " + Revision + "$")]
    public async Task GivenSomeoneHasAccepted(string name, string pose, string contributor)
    {
        await WhenSomeoneAccepts(name, pose, contributor);
        decisions.Last!.StatusCode.ShouldBe(HttpStatusCode.OK, await decisions.Last.Content.ReadAsStringAsync());
    }

    [Given(@"^(\w+) a accepté " + Revision + " en corrigeant ([^,]+)$")]
    public async Task GivenSomeoneHasAcceptedWithAnAdjustment(string name, string pose, string contributor, string adjustment)
    {
        await WhenSomeoneAcceptsWithAnAdjustment(name, pose, contributor, adjustment);
        decisions.Last!.StatusCode.ShouldBe(HttpStatusCode.OK, await decisions.Last.Content.ReadAsStringAsync());
    }

    [When(@"^(\w+) refuse " + Revision + " avec le motif " + Reason + "$")]
    public async Task WhenSomeoneRejects(string name, string pose, string contributor, string reason) =>
        decisions.OnRevisionProposal(await Reject(name, pose, contributor, new ValidationSteps.RejectionRequest(reason)));

    [When(@"^(\w+) refuse " + Revision + " sans motif$")]
    public async Task WhenSomeoneRejectsWithoutReason(string name, string pose, string contributor) =>
        decisions.OnRevisionProposal(await Reject(name, pose, contributor, new ValidationSteps.RejectionRequest(null)));

    [Given(@"^(\w+) a refusé " + Revision + " avec le motif " + Reason + "$")]
    public async Task GivenSomeoneHasRejected(string name, string pose, string contributor, string reason)
    {
        await WhenSomeoneRejects(name, pose, contributor, reason);
        decisions.Last!.StatusCode.ShouldBe(HttpStatusCode.OK, await decisions.Last.Content.ReadAsStringAsync());
    }

    private async Task<HttpResponseMessage> Accept(string name, string pose, string contributor, ValidationSteps.AcceptanceRequest acceptance)
    {
        var client = await people.SignedInClient(name);
        // Story 9a: the retained tags, named by the scenario, are sent by identifier once read in the list.
        if (acceptance.RetainedTagNames is { } tags)
            acceptance = acceptance with { TagIds = [.. (await TagNames.IdsOf(client, tags)).Select(t => t.Value)] };
        return await client.PostAsJsonAsync(
            new Uri($"/contribution/pose-revision-proposals/{revisions.IdOf(pose, contributor)}/acceptance", UriKind.Relative), acceptance);
    }

    private async Task<HttpResponseMessage> Reject(string name, string pose, string contributor, ValidationSteps.RejectionRequest rejection) =>
        await (await people.SignedInClient(name)).PostAsJsonAsync(
            new Uri($"/contribution/pose-revision-proposals/{revisions.IdOf(pose, contributor)}/rejection", UriKind.Relative), rejection);

    // --- Outcome ------------------------------------------------------------------------------

    [Then(@"^la proposition de modification de la pose ""([^""]*)"" par (\w+) est en attente de validation$")]
    public async Task ThenTheRevisionIsPending(string pose, string name)
    {
        var response = responses.Last.ShouldNotBeNull();
        response.StatusCode.ShouldBe(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        (await response.Content.ReadFromJsonAsync<RevisionResponse>())!.Status.ShouldBe("pending");
        (await PoseRevisionProposalsInDatabase.StatusesOf(people[name].Email, pose)).ShouldBe(["pending"]);
    }

    [Then(@"^la proposition de modification de la pose ""([^""]*)"" par (\w+) porte le message de modification « (.*) »$")]
    public async Task ThenTheRevisionHasTheMessage(string pose, string name, string message) =>
        (await PoseRevisionProposalsInDatabase.MessagesOf(people[name].Email, pose)).ShouldBe([message]);

    [Then(@"^la proposition de modification de la pose ""([^""]*)"" par (\w+) ne porte aucun message de modification$")]
    public async Task ThenTheRevisionHasNoMessage(string pose, string name) =>
        (await PoseRevisionProposalsInDatabase.MessagesOf(people[name].Email, pose)).ShouldBe([null]);

    [Given(@"^(\w+) a proposé le " + Day + @" de modifier la pose ""([^""]*)"" en changeant (.+)$")]
    public async Task GivenSomeoneHasProposedToReviseOn(string name, string day, string pose, string change)
    {
        clock.SetUtcNow(ScenarioClock.Parse(day));
        await GivenSomeoneHasProposedToRevise(name, pose, change);
    }

    // --- « Mes propositions » (ADR 0027) ------------------------------------------------------

    [Then("ses propositions présentent exactement les modifications suivantes :")]
    public async Task ThenMyProposalsPresentExactlyTheRevisions(DataTable expected)
    {
        var presented = (await MyRevisions()).SelectMany(revision => Changes(revision.GetProperty("changes"), "before", "after").Select(change =>
            new PresentedMyChange(
                revision.GetProperty("poseName").GetString(),
                change.Field,
                change.Current,
                change.Proposed,
                revision.GetProperty("status").GetString(),
                ScenarioClock.DayOf(revision.GetProperty("submittedAt").GetDateTimeOffset()))));

        presented.ShouldBe(expected.Rows.Select(row => new PresentedMyChange(
            row["pose"], row["champ"], row["valeur d'avant"], row["valeur proposée"], StatusCode(row["statut"]), row["soumise le"])));
    }

    [Then(@"^ses propositions présentent la modification de la pose ""([^""]*)"", (nom|difficulté base|difficulté flyer) « (.*) » → « (.*) », (acceptée|refusée|en attente de validation)$")]
    public async Task ThenMyProposalsPresentTheRevision(string pose, string field, string before, string after, string status)
    {
        var revision = await MyRevisionOf(pose);
        revision.GetProperty("status").GetString().ShouldBe(StatusCode(status));
        Changes(revision.GetProperty("changes"), "before", "after").ShouldContain((field, before, after));
    }

    [Then(@"^la modification de la pose ""([^""]*)"" présente, dans ce qui change dans la pose, les (étiquettes) « (.*) » → « (.*) »$")]
    [Then(@"^la modification de la pose ""([^""]*)"" présente, dans ce qui change dans la pose, la (difficulté base|difficulté flyer) « (.*) » → « (.*) »$")]
    public async Task ThenTheRevisionPresentsWhatChanges(string pose, string field, string before, string after) =>
        Changes((await MyRevisionOf(pose)).GetProperty("changes"), "before", "after").ShouldContain((field, before, after));

    [Then(@"^la modification de la pose ""([^""]*)"" présente, dans les ajustements apportés, les (étiquettes) « (.*) » → « (.*) »$")]
    [Then(@"^la modification de la pose ""([^""]*)"" présente, dans les ajustements apportés, la (difficulté base|difficulté flyer) « (.*) » → « (.*) »$")]
    public async Task ThenTheRevisionPresentsTheAdjustments(string pose, string field, string proposed, string retained) =>
        Changes((await MyRevisionOf(pose)).GetProperty("adjustments"), "proposed", "retained").ShouldContain((field, proposed, retained));

    [Then(@"^la modification de la pose ""([^""]*)"" est présentée comme refusée avec le motif " + Reason + "$")]
    public async Task ThenTheRevisionIsPresentedAsRejected(string pose, string reason)
    {
        var revision = await MyRevisionOf(pose);
        revision.GetProperty("status").GetString().ShouldBe("rejected");
        revision.GetProperty("reason").GetString().ShouldBe(reason);
    }

    private async Task<JsonElement> MyRevisionOf(string pose) =>
        (await MyRevisions()).Where(r => r.GetProperty("poseName").GetString() == pose).ShouldHaveSingleItem();

    private async Task<IReadOnlyList<JsonElement>> MyRevisions()
    {
        var response = consultation.Response.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        return
        [
            .. JsonSerializer.Deserialize<JsonElement>(body).GetProperty("proposals").EnumerateArray()
                .Where(p => p.GetProperty("kind").GetString() == "pose-revision"),
        ];
    }

    private static string StatusCode(string label) => label switch
    {
        "en attente de validation" => "pending",
        "acceptée" => "accepted",
        "acceptée avec ajustements" => "accepted-with-adjustments",
        "refusée" => "rejected",
        "publiée directement" => "published-directly",
        _ => throw new ArgumentOutOfRangeException(nameof(label), label, "Statut inconnu."),
    };

    private sealed record PresentedMyChange(string? Pose, string Field, string Before, string After, string? Status, string Day);

    // --- The validation queue (ADR 0027) ------------------------------------------------------

    [Then("la file de validation présente exactement les modifications suivantes :")]
    public async Task ThenTheQueuePresentsExactlyTheRevisions(DataTable expected)
    {
        var presented = (await QueuedRevisions()).SelectMany(revision => Changes(revision.GetProperty("changes"), "current", "proposed").Select(change => new PresentedChange(
            revision.GetProperty("pose").GetProperty("name").GetString(),
            change.Field,
            change.Current,
            change.Proposed,
            revision.GetProperty("contributor").GetProperty("email").GetString(),
            ScenarioClock.DayOf(revision.GetProperty("submittedAt").GetDateTimeOffset()))));

        presented.ShouldBe(expected.Rows.Select(row => new PresentedChange(
            row["pose"], row["champ"], row["valeur actuelle"], row["valeur proposée"], row["contributeur"], row["soumise le"])));
    }

    [Then(@"^la file de validation présente la modification de la pose ""([^""]*)"" avec le message de modification " + Reason + "$")]
    public async Task ThenTheQueuePresentsTheRevisionWithTheMessage(string pose, string message) =>
        (await QueuedRevisionOf(pose)).GetProperty("message").GetString().ShouldBe(message);

    [Then(@"^la file de validation présente la modification de la pose ""([^""]*)"" avec les étiquettes « (.*) » → « (.*) »$")]
    public async Task ThenTheQueuePresentsTheTagsChange(string pose, string current, string proposed) =>
        Changes((await QueuedRevisionOf(pose)).GetProperty("changes"), "current", "proposed").ShouldContain(("étiquettes", current, proposed));

    [Then(@"^la file de validation présente la modification de la pose ""([^""]*)""$")]
    public async Task ThenTheQueuePresentsTheRevision(string pose) => await QueuedRevisionOf(pose);

    private async Task<JsonElement> QueuedRevisionOf(string pose) =>
        (await QueuedRevisions()).Where(r => r.GetProperty("pose").GetProperty("name").GetString() == pose).ShouldHaveSingleItem();

    private async Task<IReadOnlyList<JsonElement>> QueuedRevisions()
    {
        var response = consultation.Response.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        return
        [
            .. JsonSerializer.Deserialize<JsonElement>(body).GetProperty("proposals").EnumerateArray()
                .Where(p => p.GetProperty("kind").GetString() == "pose-revision"),
        ];
    }

    /// <summary>
    /// The changed fields of a revision (null for an unchanged one), in the order of the form, each with its two values under the
    /// given names, with French labels for the values.
    /// </summary>
    private static IEnumerable<(string Field, string Current, string Proposed)> Changes(JsonElement changes, string from, string to)
    {
        if (changes.ValueKind == JsonValueKind.Null) yield break;
        (string Json, string Label)[] fields =
        [
            ("name", "nom"), ("baseDifficulty", "difficulté base"), ("flyerDifficulty", "difficulté flyer"),
            ("canStartFlow", "peut commencer un flow"), ("canEndFlow", "peut terminer un flow"), ("tags", "étiquettes"),
        ];
        foreach (var (json, label) in fields)
        {
            if (!changes.TryGetProperty(json, out var change) || change.ValueKind == JsonValueKind.Null) continue;
            yield return (label, Label(change.GetProperty(from)), Label(change.GetProperty(to)));
        }
    }

    private static string Label(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.True => "peut",
        JsonValueKind.False => "ne peut pas",
        // Story 9a: the tags, in catalog order, or « aucune ».
        JsonValueKind.Array => value.GetArrayLength() == 0
            ? "aucune"
            : string.Join(", ", value.EnumerateArray().Select(t => t.GetProperty("name").GetString())),
        _ => DifficultyLabels.ToLabelOrAsIs(value.GetString()!),
    };

    private sealed record PresentedChange(string? Pose, string Field, string Current, string Proposed, string? Contributor, string Day);

    [Then(@"^" + Revision + @" est acceptée sans ajustement par (\w+) le " + Day + "$")]
    public async Task ThenTheRevisionIsAcceptedWithoutAdjustmentOn(string pose, string contributor, string validator, string day)
    {
        var revision = await PoseRevisionProposalsInDatabase.RevisionOf(people[contributor].Email, pose);
        revision.Status.ShouldBe("accepted");
        revision.DecidedBy.ShouldBe(people[validator].Email);
        ScenarioClock.DayOf(revision.DecidedAt.ShouldNotBeNull()).ShouldBe(day);
        revision.Retained.ShouldBe(revision.Proposed);
        revision.AdjustmentNote.ShouldBeNull();
    }

    [Then(@"^la proposition garde la difficulté (base|flyer) d'avant ""([^""]*)"" et la difficulté (?:base|flyer) proposée ""([^""]*)""$")]
    public async Task ThenTheRevisionKeepsThePriorAndProposedDifficulty(string role, string prior, string proposed)
    {
        var (pose, contributor) = revisions.Last;
        var revision = await PoseRevisionProposalsInDatabase.RevisionOf(people[contributor].Email, pose);
        (role == "base" ? revision.Prior.BaseDifficulty : revision.Prior.FlyerDifficulty).ShouldBe(DifficultyLabels.ToCode(prior));
        (role == "base" ? revision.Proposed.BaseDifficulty : revision.Proposed.FlyerDifficulty).ShouldBe(DifficultyLabels.ToCode(proposed));
    }

    [Then(@"^" + Revision + @" est acceptée avec ajustements par (\w+)$")]
    public async Task ThenTheRevisionIsAcceptedWithAdjustmentsBy(string pose, string contributor, string validator)
    {
        var revision = await PoseRevisionProposalsInDatabase.RevisionOf(people[contributor].Email, pose);
        revision.Status.ShouldBe("accepted");
        revision.DecidedBy.ShouldBe(people[validator].Email);
        revision.Retained.ShouldNotBeNull().ShouldNotBe(revision.Proposed);
    }

    [Then(@"^" + Revision + @" est refusée par (\w+) avec le motif " + Reason + "$")]
    public async Task ThenTheRevisionIsRejectedWithTheReason(string pose, string contributor, string validator, string reason)
    {
        var revision = await PoseRevisionProposalsInDatabase.RevisionOf(people[contributor].Email, pose);
        revision.Status.ShouldBe("rejected");
        revision.DecidedBy.ShouldBe(people[validator].Email);
        revision.RejectionReason.ShouldBe(reason);
    }

    // --- HTTP ---------------------------------------------------------------------------------

    /// <summary>The pose each person started to revise, as read then (id and version, ADR 0024).</summary>
    private readonly Dictionary<string, PublishedPoseResponse> _started = [];

    [Given(@"^(\w+) a commencé à modifier la pose ""([^""]*)""$")]
    public async Task GivenSomeoneHasStartedToRevise(string name, string pose) =>
        _started[name] = await ReadPublishedPose(await people.SignedInClient(name), pose);

    [Given(@"^(\w+) a proposé entre-temps de modifier la pose ""([^""]*)"" en changeant (.+)$")]
    public Task GivenSomeoneHasProposedToReviseMeanwhile(string name, string pose, string change) =>
        GivenSomeoneHasProposedToRevise(name, pose, change);

    [When(@"^(\w+) propose la modification commencée en changeant (.+)$")]
    public async Task WhenSomeoneProposesTheStartedRevision(string name, string change)
    {
        var started = _started[name];
        responses.Last = await (await people.SignedInClient(name)).PostAsJsonAsync(
            PoseRevisionProposals, WithChange(new RevisionRequest(started.Id, started.Version), change));
    }

    private async Task<HttpResponseMessage> ProposeRevision(string name, string pose, string change)
    {
        var client = await people.SignedInClient(name);
        var current = await ReadPublishedPose(client, pose);
        var request = WithChange(new RevisionRequest(current.Id, current.Version), change);
        if (request.TagNames is { } tags) request = request with { TagIds = [.. (await TagNames.IdsOf(client, tags)).Select(t => t.Value)] };
        var response = await client.PostAsJsonAsync(PoseRevisionProposals, request);
        if (response.StatusCode == HttpStatusCode.Created)
        {
            var received = JsonSerializer.Deserialize<RevisionResponse>(await response.Content.ReadAsStringAsync(), JsonSerializerOptions.Web)!;
            revisions.Received(name, pose, received.Id);
        }

        return response;
    }

    /// <summary>As the website: the pose found in the catalog list, then read with its version.</summary>
    private static async Task<PublishedPoseResponse> ReadPublishedPose(HttpClient client, string pose)
    {
        var list = await client.GetFromJsonAsync<PoseListResponse>(new Uri("/catalog/poses", UriKind.Relative));
        var id = list!.Poses.Single(p => p.Name == pose).Id;
        var response = await client.GetAsync(new Uri($"/catalog/poses/{id}", UriKind.Relative));
        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<PublishedPoseResponse>())!;
    }

    /// <summary>
    /// « la difficulté flyer en "découverte" », « le nom en "Throne" », « l'indicateur « peut terminer un flow » en « ne peut pas » »,
    /// possibly followed by « , avec le message « … » » or « , avec un message de 500 caractères ».
    /// </summary>
    private static RevisionRequest WithChange(RevisionRequest request, string change)
    {
        if (WithMessage().Match(change) is { Success: true } withMessage)
        {
            var message = withMessage.Groups["length"].Success
                ? new string('x', int.Parse(withMessage.Groups["length"].Value, CultureInfo.InvariantCulture))
                : withMessage.Groups["message"].Value;
            return WithChange(request, withMessage.Groups["change"].Value) with { Message = message };
        }

        // Story 9a: « les étiquettes en "lunaire" et "inversion" », « toutes ses étiquettes » removed.
        if (change.StartsWith("les étiquettes en ", StringComparison.Ordinal))
            return request with { TagNames = TagNames.In(change["les étiquettes en ".Length..]) };
        if (change == "toutes ses étiquettes") return request with { TagNames = [] };
        if (NameOfLength().Match(change) is { Success: true } length)
            return request with { Name = "Pose " + new string('x', int.Parse(length.Groups[1].Value, CultureInfo.InvariantCulture) - "Pose ".Length) };
        if (Change().Match(change) is not { Success: true } match)
            throw new ArgumentOutOfRangeException(nameof(change), change, "Changement inconnu.");

        var value = match.Groups["value"].Value;
        return match.Groups["field"].Value switch
        {
            "le nom" => request with { Name = value },
            "la difficulté base" => request with { BaseDifficulty = DifficultyLabels.ToCodeOrAsIs(value) },
            "la difficulté flyer" => request with { FlyerDifficulty = DifficultyLabels.ToCodeOrAsIs(value) },
            "l'indicateur « peut commencer un flow »" => request with { CanStartFlow = value == "peut" },
            "l'indicateur « peut terminer un flow »" => request with { CanEndFlow = value == "peut" },
            var field => throw new ArgumentOutOfRangeException(nameof(change), field, "Champ inconnu."),
        };
    }

    [GeneratedRegex(@"^(?<change>.+?), avec (?:le message « (?<message>.*) »|un message de (?<length>\d+) caractères)$")]
    private static partial Regex WithMessage();

    [GeneratedRegex(@"^le nom en un nom de (\d+) caractères$")]
    private static partial Regex NameOfLength();

    [GeneratedRegex("""^(?<field>le nom|la difficulté base|la difficulté flyer|l'indicateur « peut (?:commencer|terminer) un flow ») en (?:"(?<value>[^"]*)"|« (?<value>[^»]*) »)$""")]
    private static partial Regex Change();

    // Black-box view of the HTTP contract (deliberately not the Api types).
    private sealed record PoseListResponse(IReadOnlyList<PoseSummary> Poses);

    private sealed record PoseSummary(Guid Id, string Name);

    private sealed record PublishedPoseResponse(Guid Id, string Name, int Version);

    private sealed record RevisionRequest(
        Guid PoseId,
        int PoseVersion,
        string? Name = null,
        string? BaseDifficulty = null,
        string? FlyerDifficulty = null,
        bool? CanStartFlow = null,
        bool? CanEndFlow = null,
        string? Message = null)
    {
        /// <summary>The tags of the revised pose (story 9a), by identifier; absent keeps those of the pose.</summary>
        [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
        public IReadOnlyList<Guid>? TagIds { get; init; }

        /// <summary>The tags as named by the scenario, resolved to identifiers before sending.</summary>
        [System.Text.Json.Serialization.JsonIgnore]
        public IReadOnlyList<string>? TagNames { get; init; }
    }

    private sealed record RevisionResponse(Guid Id, string Status);
}
