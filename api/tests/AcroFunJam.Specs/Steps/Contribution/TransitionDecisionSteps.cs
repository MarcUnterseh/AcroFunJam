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
/// Story 7: a transition proposal in the validation queue and the decisions on it (ADR 0028, ADR 0030). A decision is observed
/// in the database: who decided is never exposed to the contributor (ADR 0023).
/// </summary>
[Binding]
public sealed partial class TransitionDecisionSteps(
    People people, ScenarioTransitionProposals proposals, ScenarioDecisions decisions, ScenarioClock clock, Consultation consultation)
{
    /// <summary>« la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice » or « … sans nom de … ».</summary>
    private const string Proposal = @"la proposition de la transition (sans nom|""[^""]*"") de ""([^""]*)"" vers ""([^""]*)"" par (\w+)";

    private const string Reason = @"« ?(.*?) ?»";
    private const string Day = @"(\d{4}-\d{2}-\d{2})";

    // --- Deciding -----------------------------------------------------------------------------

    [When("^(\\w+) accepte " + Proposal + "$")]
    public Task WhenSomeoneAccepts(string name, string transition, string from, string to, string contributor) =>
        Accept(name, Id(transition, from, to, contributor), new AcceptanceRequest());

    [Given("^(\\w+) a accepté " + Proposal + "$")]
    public async Task GivenSomeoneHasAccepted(string name, string transition, string from, string to, string contributor)
    {
        await WhenSomeoneAccepts(name, transition, from, to, contributor);
        await ShouldBeDecided();
    }

    [When("^(\\w+) accepte le " + Day + " " + Proposal + "$")]
    public Task WhenSomeoneAcceptsOn(string name, string day, string transition, string from, string to, string contributor)
    {
        clock.SetUtcNow(ScenarioClock.Parse(day));
        return WhenSomeoneAccepts(name, transition, from, to, contributor);
    }

    [When("^(\\w+) accepte " + Proposal + " en (corrigeant .+|retirant le nom)$")]
    public Task WhenSomeoneAcceptsWithAdjustments(string name, string transition, string from, string to, string contributor, string adjustments) =>
        Accept(name, Id(transition, from, to, contributor), Adjusting(adjustments));

    [Given("^(\\w+) a accepté " + Proposal + " en (corrigeant .+|retirant le nom)$")]
    public async Task GivenSomeoneHasAcceptedWithAdjustments(
        string name, string transition, string from, string to, string contributor, string adjustments)
    {
        await WhenSomeoneAcceptsWithAdjustments(name, transition, from, to, contributor, adjustments);
        await ShouldBeDecided();
    }

    [When("^(\\w+) refuse " + Proposal + " avec le motif " + Reason + "$")]
    public async Task WhenSomeoneRejects(string name, string transition, string from, string to, string contributor, string reason)
    {
        var id = Id(transition, from, to, contributor);
        var client = await people.SignedInClient(name);
        decisions.OnTransitionProposal(
            await client.PostAsJsonAsync(new Uri($"/contribution/transition-proposals/{id}/rejection", UriKind.Relative), new { reason }), id);
    }

    [Given("^(\\w+) a refusé " + Proposal + " avec le motif " + Reason + "$")]
    public async Task GivenSomeoneHasRejected(string name, string transition, string from, string to, string contributor, string reason)
    {
        await WhenSomeoneRejects(name, transition, from, to, contributor, reason);
        await ShouldBeDecided();
    }

    // --- Outcome ------------------------------------------------------------------------------

    [Then("^" + Proposal + @" est acceptée sans ajustement par (\w+)$")]
    public Task ThenTheProposalIsAcceptedWithoutAdjustment(string transition, string from, string to, string contributor, string validator) =>
        ThenTheProposalIsAcceptedWithoutAdjustmentOn(transition, from, to, contributor, validator, day: null);

    [Then("^" + Proposal + @" est acceptée sans ajustement par (\w+) le " + Day + "$")]
    public async Task ThenTheProposalIsAcceptedWithoutAdjustmentOn(
        string transition, string from, string to, string contributor, string validator, string? day)
    {
        var decision = await DecisionOn(transition, from, to, contributor, validator, "accepted");
        decision.Retained.ShouldBe(decision.Proposed);
        decision.AdjustmentNote.ShouldBeNull();
        if (!string.IsNullOrEmpty(day)) ScenarioClock.DayOf(decision.DecidedAt!.Value).ShouldBe(day);
        (await ShouldBeDecided()).GetProperty("adjusted").GetBoolean().ShouldBeFalse();
    }

    [Then("^" + Proposal + @" est acceptée avec ajustements par (\w+)$")]
    public async Task ThenTheProposalIsAcceptedWithAdjustments(string transition, string from, string to, string contributor, string validator)
    {
        var decision = await DecisionOn(transition, from, to, contributor, validator, "accepted");
        decision.Retained.ShouldNotBe(decision.Proposed);
        (await ShouldBeDecided()).GetProperty("adjusted").GetBoolean().ShouldBeTrue();
    }

    [Then("^" + Proposal + @" est refusée par (\w+) avec le motif " + Reason + "$")]
    public async Task ThenTheProposalIsRejected(string transition, string from, string to, string contributor, string validator, string reason)
    {
        var decision = await DecisionOn(transition, from, to, contributor, validator, "rejected");
        decision.RejectionReason.ShouldBe(reason);
        decision.Retained.ShouldBeNull();
    }

    private async Task<RecordedTransitionDecision> DecisionOn(
        string transition, string from, string to, string contributor, string validator, string status)
    {
        var decision = await TransitionProposalsInDatabase.DecisionOn(Id(transition, from, to, contributor));
        decision.Status.ShouldBe(status);
        decision.DecidedBy.ShouldBe(people[validator].Email);
        return decision;
    }

    // --- Validation queue ---------------------------------------------------------------------

    [Then("la file de validation présente exactement les transitions suivantes :")]
    public async Task ThenTheQueuePresentsExactlyTheTransitions(DataTable expected)
    {
        var presented = (await Queue()).Where(p => p.Kind == "transition-proposal").Select(p => new PresentedTransition(
            p.FromPose?.Name, p.ToPose?.Name, p.Name, p.BaseDifficulty, p.FlyerDifficulty, p.Description, p.Contributor?.Email,
            p.SubmittedAt is { } submittedAt ? ScenarioClock.DayOf(submittedAt) : null));

        presented.ShouldBe(expected.Rows.Select(row => new PresentedTransition(
            row["pose de départ"], row["pose d'arrivée"], Blank(row["nom"]), DifficultyLabels.ToCode(row["difficulté base"]),
            DifficultyLabels.ToCode(row["difficulté flyer"]), Blank(row["description"]), row["contributeur"], row["soumise le"])));
    }

    [Then(@"^la file de validation présente la transition (sans nom|""[^""]*"") de ""([^""]*)"" vers ""([^""]*)""$")]
    public async Task ThenTheQueuePresentsTheTransition(string transition, string from, string to) =>
        (await Queue()).Where(p => p.Kind == "transition-proposal" && p.FromPose?.Name == from && p.ToPose?.Name == to && p.Name == NameIn(transition))
            .ShouldHaveSingleItem();

    private async Task<IReadOnlyList<QueuedResponse>> Queue()
    {
        var response = consultation.Response.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        return JsonSerializer.Deserialize<QueueResponse>(body, JsonSerializerOptions.Web)!.Proposals;
    }

    // --- Adjustments --------------------------------------------------------------------------

    /// <summary>
    /// « corrigeant le nom en "Ninja Star", la difficulté flyer en "avancé" et la description en « … » », « corrigeant la
    /// description par un texte de 501 caractères », « retirant le nom ».
    /// </summary>
    private static AcceptanceRequest Adjusting(string adjustments)
    {
        if (adjustments == "retirant le nom") return new AcceptanceRequest { Name = "" };
        // Story 8: « corrigeant les étiquettes en "pop" et "vrille" », sent by identifier once read in the list.
        const string Tags = "corrigeant les étiquettes en ";
        if (adjustments.StartsWith(Tags, StringComparison.Ordinal)) return new AcceptanceRequest { RetainedTagNames = TagNames.In(adjustments[Tags.Length..]) };
        var request = new AcceptanceRequest();
        foreach (Match adjustment in AdjustedField().Matches(adjustments))
        {
            var value = adjustment.Groups["quoted"].Success ? adjustment.Groups["quoted"].Value
                : adjustment.Groups["text"].Success ? adjustment.Groups["text"].Value
                : new string('x', int.Parse(adjustment.Groups["length"].Value, System.Globalization.CultureInfo.InvariantCulture));
            request = adjustment.Groups["field"].Value switch
            {
                "le nom" => request with { Name = value },
                "la difficulté base" => request with { BaseDifficulty = DifficultyLabels.ToCodeOrAsIs(value) },
                "la difficulté flyer" => request with { FlyerDifficulty = DifficultyLabels.ToCodeOrAsIs(value) },
                _ => request with { Description = value },
            };
        }

        return request;
    }

    [GeneratedRegex(@"(?<field>le nom|la difficulté base|la difficulté flyer|la description) (?:en (?:""(?<quoted>[^""]*)""|« ?(?<text>.*?) ?»)|par un texte de (?<length>\d+) caractères)")]
    private static partial Regex AdjustedField();

    // --- HTTP ---------------------------------------------------------------------------------

    private Guid Id(string transition, string from, string to, string contributor) => proposals.IdOf(contributor, from, to, NameIn(transition));

    private async Task Accept(string name, Guid id, AcceptanceRequest acceptance)
    {
        var client = await people.SignedInClient(name);
        if (acceptance.RetainedTagNames is { } tags)
            acceptance = acceptance with { TagIds = [.. (await TagNames.IdsOf(client, tags)).Select(t => t.Value)] };
        decisions.OnTransitionProposal(
            await client.PostAsJsonAsync(new Uri($"/contribution/transition-proposals/{id}/acceptance", UriKind.Relative), acceptance), id);
    }

    private async Task<JsonElement> ShouldBeDecided()
    {
        var response = decisions.Last.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        return JsonSerializer.Deserialize<JsonElement>(body);
    }

    private static string? NameIn(string transition) => transition == "sans nom" ? null : transition.Trim('"');

    private static string? Blank(string value) => string.IsNullOrWhiteSpace(value) ? null : value;

    // Black-box view of the HTTP contract (deliberately not the Api types). An absent member is left out of the request.
    private sealed record AcceptanceRequest
    {
        [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
        public string? Name { get; init; }

        [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
        public string? BaseDifficulty { get; init; }

        [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
        public string? FlyerDifficulty { get; init; }

        [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
        public string? Description { get; init; }

        [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
        public IReadOnlyList<Guid>? TagIds { get; init; }

        /// <summary>The names of the retained tags in the Gherkin, read in the list before sending.</summary>
        [System.Text.Json.Serialization.JsonIgnore]
        public IReadOnlyList<string>? RetainedTagNames { get; init; }
    }

    private sealed record QueueResponse(IReadOnlyList<QueuedResponse> Proposals);

    private sealed record PoseReference(Guid Id, string Name);

    private sealed record ContributorResponse(string? Email, bool? IsYou);

    private sealed record QueuedResponse(
        string? Kind, Guid Id, PoseReference? FromPose, PoseReference? ToPose, string? Name, string? BaseDifficulty, string? FlyerDifficulty,
        string? Description, ContributorResponse? Contributor, DateTimeOffset? SubmittedAt);

    private sealed record PresentedTransition(
        string? From, string? To, string? Name, string? BaseDifficulty, string? FlyerDifficulty, string? Description, string? ContributorEmail,
        string? SubmittedOn);
}
