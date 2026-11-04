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
/// The validation queue and the decisions on a proposal (story 4, ADR 0022), through the HTTP contract described in
/// docs/domain/context-map.md. A decision is observed in the database until "Suivre mes propositions" exists (ADR 0020).
/// </summary>
[Binding]
public sealed class ValidationSteps(People people, Deployment deployment, ScenarioProposals proposals, ScenarioClock clock)
{
    private const string Proposal = @"la proposition de la pose ""([^""]*)"" par (\w+)";
    private const string Reason = @"« ?(.*?) ?»";
    private const string Day = @"(\d{4}-\d{2}-\d{2})";

    /// <summary>« la difficulté flyer en "découverte" », « le nom en "Throne" », « l'indicateur en « … » » (no comma).</summary>
    private const string Adjustment = "([^,]+)";

    private static readonly Uri ValidationQueue = new("/contribution/validation-queue", UriKind.Relative);
    private static readonly Uri PendingCount = new("/contribution/validation-queue/count", UriKind.Relative);

    private HttpResponseMessage? _consultation;
    private HttpResponseMessage? _decision;

    // --- Consulting the queue -----------------------------------------------------------------

    [When(@"^(\w+) consulte la file de validation$")]
    public async Task WhenSomeoneConsultsTheQueue(string name) =>
        _consultation = await (await people.SignedInClient(name)).GetAsync(ValidationQueue);

    [When("un visiteur consulte la file de validation")]
    public async Task WhenAVisitorConsultsTheQueue()
    {
        using var visitor = deployment.Current.CreateClient();
        _consultation = await visitor.GetAsync(ValidationQueue);
    }

    [When(@"^(\w+) consulte le nombre de propositions en attente de validation$")]
    public async Task WhenSomeoneConsultsThePendingCount(string name) =>
        _consultation = await (await people.SignedInClient(name)).GetAsync(PendingCount);

    [Then("^la file de validation présente " + Proposal + "$")]
    public async Task ThenTheQueuePresentsTheProposal(string pose, string contributor) =>
        (await Queue()).Proposals
            .Where(p => p.Name == pose && p.Contributor?.Email == people[contributor].Email)
            .ShouldHaveSingleItem();

    [Then("la file de validation présente exactement les propositions suivantes :")]
    public async Task ThenTheQueuePresentsExactly(DataTable expected)
    {
        var presented = (await Queue()).Proposals.Select(p => new PresentedProposal(
            p.Name,
            p.BaseDifficulty,
            p.FlyerDifficulty,
            p.CanStartFlow,
            p.CanEndFlow,
            p.Contributor?.Email,
            p.SubmittedAt is { } submittedAt ? ScenarioClock.DayOf(submittedAt) : null));

        presented.ShouldBe(expected.Rows.Select(row => new PresentedProposal(
            row["pose"],
            DifficultyLabels.ToCode(row["difficulté base"]),
            DifficultyLabels.ToCode(row["difficulté flyer"]),
            row["commencer"] == "peut",
            row["terminer"] == "peut",
            row["contributeur"],
            row["soumise le"])));
    }

    [Then("la file de validation présente exactement les propositions de pose suivantes :")]
    public async Task ThenTheQueuePresentsExactlyThePoses(DataTable expected) =>
        (await Queue()).Proposals.Select(p => p.Name).ShouldBe(expected.Rows.Select(row => row["pose"]), ignoreOrder: true);

    [Then("les propositions sont présentées dans cet ordre :")]
    public async Task ThenTheProposalsArePresentedInOrder(DataTable expected) =>
        (await Queue()).Proposals.Select(p => p.Name).ShouldBe(expected.Rows.Select(row => row["pose"]));

    [Then(@"^(\w+) est informée? qu'aucune proposition n'est en attente de validation$")]
    public async Task ThenTheQueueIsEmpty(string name)
    {
        // Through the API, the queue is empty: the message itself is the front's concern (ADR 0007).
        _ = name;
        (await Queue()).Proposals.ShouldBeEmpty();
    }

    [Then(@"^(\d+) propositions? (?:sont|est) en attente de validation$")]
    public async Task ThenTheNumberOfPendingProposalsIs(int count)
    {
        var response = _consultation.ShouldNotBeNull();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        (await Body<CountResponse>(response)).ShouldNotBeNull().Count.ShouldBe(count);
    }

    [Then(@"^la consultation est refusée car (.+)$")]
    public Task ThenTheConsultationIsRefused(string reason) => ShouldBeRefused(_consultation, reason);

    // --- Deciding -----------------------------------------------------------------------------

    [When("^(\\w+) accepte " + Proposal + "$")]
    public async Task WhenSomeoneAccepts(string name, string pose, string contributor) =>
        _decision = await Accept(await people.SignedInClient(name), proposals.IdOf(pose, contributor));

    [When("^(\\w+) accepte " + Proposal + " en corrigeant " + Adjustment + "$")]
    public async Task WhenSomeoneAcceptsWithAnAdjustment(string name, string pose, string contributor, string adjustment) =>
        _decision = await Accept(await people.SignedInClient(name), proposals.IdOf(pose, contributor), Adjusting(adjustment));

    [When("^(\\w+) accepte " + Proposal + " en corrigeant " + Adjustment + ", avec le message " + Reason + "$")]
    public async Task WhenSomeoneAcceptsWithAnAdjustmentAndANote(string name, string pose, string contributor, string adjustment, string note) =>
        _decision = await Accept(
            await people.SignedInClient(name), proposals.IdOf(pose, contributor), Adjusting(adjustment) with { Message = note });

    [When("^(\\w+) accepte " + Proposal + " en corrigeant " + Adjustment + @", avec un message de (\d+) caractères$")]
    public Task WhenSomeoneAcceptsWithAnAdjustmentAndANoteOfLength(string name, string pose, string contributor, string adjustment, int length) =>
        WhenSomeoneAcceptsWithAnAdjustmentAndANote(name, pose, contributor, adjustment, ANoteOfLength(length));

    [When("^(\\w+) accepte " + Proposal + " sans ajustement, avec le message " + Reason + "$")]
    public async Task WhenSomeoneAcceptsWithoutAdjustmentWithANote(string name, string pose, string contributor, string note) =>
        _decision = await Accept(await people.SignedInClient(name), proposals.IdOf(pose, contributor), new AcceptanceRequest { Message = note });

    [When("^(\\w+) accepte le " + Day + " " + Proposal + "$")]
    public async Task WhenSomeoneAcceptsOn(string name, string day, string pose, string contributor)
    {
        clock.SetUtcNow(ScenarioClock.Parse(day));
        _decision = await Accept(await people.SignedInClientAgain(name), proposals.IdOf(pose, contributor));
    }

    [When("^un visiteur accepte " + Proposal + "$")]
    public async Task WhenAVisitorAccepts(string pose, string contributor)
    {
        using var visitor = deployment.Current.CreateClient();
        _decision = await Accept(visitor, proposals.IdOf(pose, contributor));
    }

    [When(@"^(\w+) accepte une proposition qui n'existe pas$")]
    public async Task WhenSomeoneAcceptsAnUnknownProposal(string name) =>
        _decision = await Accept(await people.SignedInClient(name), Guid.NewGuid());

    [Given("^(\\w+) a accepté " + Proposal + "$")]
    public async Task GivenSomeoneHasAccepted(string name, string pose, string contributor)
    {
        await WhenSomeoneAccepts(name, pose, contributor);
        _decision!.StatusCode.ShouldBe(HttpStatusCode.OK, await _decision.Content.ReadAsStringAsync());
    }

    [Given("^(\\w+) a accepté " + Proposal + " en corrigeant " + Adjustment + "$")]
    public async Task GivenSomeoneHasAcceptedWithAnAdjustment(string name, string pose, string contributor, string adjustment)
    {
        await WhenSomeoneAcceptsWithAnAdjustment(name, pose, contributor, adjustment);
        _decision!.StatusCode.ShouldBe(HttpStatusCode.OK, await _decision.Content.ReadAsStringAsync());
    }

    /// <summary>An attempt that the API refused (4xx), not a proposal it could not find.</summary>
    [Given("^(\\w+) a tenté d'accepter " + Proposal + " en corrigeant " + Adjustment + "$")]
    public async Task GivenSomeoneHasTriedToAcceptWithAnAdjustment(string name, string pose, string contributor, string adjustment)
    {
        await WhenSomeoneAcceptsWithAnAdjustment(name, pose, contributor, adjustment);
        await ShouldBeARefusedAttempt(_decision!);
    }

    /// <summary>An attempt that the API refused (4xx), not a proposal it could not find.</summary>
    [Given("^(\\w+) a tenté d'accepter " + Proposal + " en corrigeant " + Adjustment + @", avec un message de (\d+) caractères$")]
    public async Task GivenSomeoneHasTriedToAcceptWithAnAdjustmentAndANoteOfLength(
        string name, string pose, string contributor, string adjustment, int length)
    {
        await WhenSomeoneAcceptsWithAnAdjustmentAndANoteOfLength(name, pose, contributor, adjustment, length);
        await ShouldBeARefusedAttempt(_decision!);
    }

    /// <summary>An attempt that the API refused (4xx), not a proposal it could not find.</summary>
    [Given("^(\\w+) a tenté d'accepter " + Proposal + "$")]
    public async Task GivenSomeoneHasTriedToAccept(string name, string pose, string contributor)
    {
        await WhenSomeoneAccepts(name, pose, contributor);
        await ShouldBeARefusedAttempt(_decision!);
    }

    [When("^(\\w+) refuse " + Proposal + " avec le motif " + Reason + "$")]
    public async Task WhenSomeoneRejects(string name, string pose, string contributor, string reason) =>
        _decision = await Reject(await people.SignedInClient(name), proposals.IdOf(pose, contributor), new RejectionRequest(reason));

    [When("^(\\w+) refuse " + Proposal + " sans motif$")]
    public async Task WhenSomeoneRejectsWithoutReason(string name, string pose, string contributor) =>
        _decision = await Reject(await people.SignedInClient(name), proposals.IdOf(pose, contributor), new RejectionRequest(null));

    [When("^(\\w+) refuse " + Proposal + @" avec un motif de (\d+) caractères$")]
    public Task WhenSomeoneRejectsWithAReasonOfLength(string name, string pose, string contributor, int length) =>
        WhenSomeoneRejects(name, pose, contributor, AReasonOfLength(length));

    [Given("^(\\w+) a refusé " + Proposal + " avec le motif " + Reason + "$")]
    public async Task GivenSomeoneHasRejected(string name, string pose, string contributor, string reason)
    {
        await WhenSomeoneRejects(name, pose, contributor, reason);
        _decision!.StatusCode.ShouldBe(HttpStatusCode.OK, await _decision.Content.ReadAsStringAsync());
    }

    /// <summary>An attempt that the API refused (4xx), not a proposal it could not find.</summary>
    [Given("^(\\w+) a tenté de refuser " + Proposal + " sans motif$")]
    public async Task GivenSomeoneHasTriedToRejectWithoutReason(string name, string pose, string contributor)
    {
        await WhenSomeoneRejectsWithoutReason(name, pose, contributor);
        await ShouldBeARefusedAttempt(_decision!);
    }

    // --- Outcome of a decision ----------------------------------------------------------------

    [Then("^" + Proposal + @" est acceptée sans ajustement par (\w+)$")]
    public async Task ThenTheProposalIsAcceptedWithoutAdjustment(string pose, string contributor, string validator)
    {
        var accepted = await Accepted();
        accepted.Adjusted.ShouldBe(false);
        accepted.Name.ShouldBe(pose);

        var decision = await PoseProposalsInDatabase.DecisionOn(people[contributor].Email, pose);
        decision.Status.ShouldBe("accepted");
        decision.DecidedBy.ShouldBe(people[validator].Email);
        // The retained pose is the proposed pose, without note.
        var poses = await PoseProposalsInDatabase.PosesOf(accepted.Id);
        poses.Retained.ShouldBe(poses.Proposed);
        poses.AdjustmentNote.ShouldBeNull();
    }

    [Then("^" + Proposal + @" est acceptée avec ajustements par (\w+)$")]
    public async Task ThenTheProposalIsAcceptedWithAdjustmentsBy(string pose, string contributor, string validator)
    {
        await ThenTheProposalIsAcceptedWithAdjustments(pose, contributor);
        var decision = await PoseProposalsInDatabase.DecisionOn(people[contributor].Email, pose);
        decision.Status.ShouldBe("accepted");
        decision.DecidedBy.ShouldBe(people[validator].Email);
    }

    [Then("^" + Proposal + " est acceptée avec ajustements$")]
    public async Task ThenTheProposalIsAcceptedWithAdjustments(string pose, string contributor)
    {
        var accepted = await Accepted();
        accepted.Id.ShouldBe(proposals.IdOf(pose, contributor));
        accepted.Adjusted.ShouldBe(true);
        (await PoseProposalsInDatabase.PosesOf(accepted.Id)).IsAdjusted.ShouldBeTrue();
    }

    [Then("^" + Proposal + " est acceptée avec ajustements et le message " + Reason + "$")]
    public async Task ThenTheProposalIsAcceptedWithAdjustmentsAndTheNote(string pose, string contributor, string note)
    {
        await ThenTheProposalIsAcceptedWithAdjustments(pose, contributor);
        (await PoseProposalsInDatabase.PosesOf(proposals.IdOf(pose, contributor))).AdjustmentNote.ShouldBe(note);
    }

    [Then("^" + Proposal + " est acceptée avec ajustements, sans message$")]
    public async Task ThenTheProposalIsAcceptedWithAdjustmentsWithoutNote(string pose, string contributor)
    {
        await ThenTheProposalIsAcceptedWithAdjustments(pose, contributor);
        (await PoseProposalsInDatabase.PosesOf(proposals.IdOf(pose, contributor))).AdjustmentNote.ShouldBeNull();
    }

    [Then(@"^la proposition garde la difficulté (base|flyer) proposée ""([^""]*)"" et la difficulté (?:base|flyer) retenue ""([^""]*)""$")]
    public async Task ThenTheProposalKeepsTheProposedAndRetainedDifficulty(string role, string proposed, string retained)
    {
        var poses = await PoseProposalsInDatabase.PosesOf((await Accepted()).Id);
        var stored = poses.Retained.ShouldNotBeNull();
        (role == "base" ? poses.Proposed.BaseDifficulty : poses.Proposed.FlyerDifficulty).ShouldBe(DifficultyLabels.ToCode(proposed));
        (role == "base" ? stored.BaseDifficulty : stored.FlyerDifficulty).ShouldBe(DifficultyLabels.ToCode(retained));
    }

    [Then("^" + Proposal + @" est acceptée sans ajustement par (\w+) le " + Day + "$")]
    public async Task ThenTheProposalIsAcceptedWithoutAdjustmentOn(string pose, string contributor, string validator, string day)
    {
        await ThenTheProposalIsAcceptedWithoutAdjustment(pose, contributor, validator);
        var decision = await PoseProposalsInDatabase.DecisionOn(people[contributor].Email, pose);
        decision.DecidedAt.ShouldNotBeNull();
        ScenarioClock.DayOf(decision.DecidedAt.Value).ShouldBe(day);
    }

    [Then("^" + Proposal + @" est refusée par (\w+) avec le motif " + Reason + "$")]
    public async Task ThenTheProposalIsRejectedWithTheReason(string pose, string contributor, string validator, string reason)
    {
        await ThenTheProposalIsRejected(pose, contributor);
        var decision = await PoseProposalsInDatabase.DecisionOn(people[contributor].Email, pose);
        decision.DecidedBy.ShouldBe(people[validator].Email);
        decision.RejectionReason.ShouldBe(reason);
    }

    [Then("^" + Proposal + " est refusée$")]
    public async Task ThenTheProposalIsRejected(string pose, string contributor)
    {
        var response = _decision.ShouldNotBeNull();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var rejected = (await Body<RejectedResponse>(response)).ShouldNotBeNull();
        rejected.Id.ShouldBe(proposals.IdOf(pose, contributor));
        rejected.Status.ShouldBe("rejected");
        (await PoseProposalsInDatabase.DecisionOn(people[contributor].Email, pose)).Status.ShouldBe("rejected");
    }

    [Then(@"^la décision est refusée car (.+)$")]
    public Task ThenTheDecisionIsRefused(string reason) => ShouldBeRefused(_decision, reason);

    [Then(@"^la décision est impossible car (.+)$")]
    [Then(@"^le refus est impossible car (.+)$")]
    [Then(@"^l'acceptation est impossible car (.+)$")]
    public async Task ThenTheDecisionIsImpossible(string reason)
    {
        var (status, code) = Impossibility(reason);
        await ShouldBeAProblem(_decision, status, code);
    }

    // --- Refusals and impossibilities ---------------------------------------------------------

    private static async Task ShouldBeRefused(HttpResponseMessage? response, string reason)
    {
        var (status, codes) = Refusal(reason);
        await ShouldBeAProblem(response, status, codes);
    }

    private static (HttpStatusCode Status, string[] Codes) Refusal(string reason) => reason switch
    {
        "il faut être connecté" => (HttpStatusCode.Unauthorized, []),
        // Only the codes HTTP actually returns here: the policy refuses before the use case. The refusal by the aggregate
        // (contribution.validator-required, contribution.unknown-validator), for a role revoked or an account deleted
        // between the policy and the use case (ADR 0022), is covered by PoseProposalTests, the handler tests and
        // ProblemResultsTests.
        "seul un validateur ou un administrateur accepte ou refuse une proposition"
            or "seul un validateur ou un administrateur consulte la file de validation" =>
            (HttpStatusCode.Forbidden, ["identity.capability-required"]),
        // Handled by the site as an expired session (ADR 0018).
        "le compte n'existe plus et il faut se reconnecter" => (HttpStatusCode.Unauthorized, ["identity.account-deleted"]),
        _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Motif de refus inconnu."),
    };

    private static (HttpStatusCode Status, string Code) Impossibility(string reason) => reason switch
    {
        "la proposition a déjà été traitée" => (HttpStatusCode.Conflict, "contribution.proposal-already-decided"),
        "la proposition est introuvable" => (HttpStatusCode.NotFound, "contribution.proposal-not-found"),
        "le motif de refus est obligatoire" => (HttpStatusCode.BadRequest, "contribution.rejection-reason-required"),
        "le motif de refus est trop long" => (HttpStatusCode.BadRequest, "contribution.rejection-reason-too-long"),
        "une pose de ce nom existe déjà dans le catalogue" => (HttpStatusCode.Conflict, "contribution.pose-name-already-in-catalog"),
        "une pose de ce nom est déjà en attente de validation" => (HttpStatusCode.Conflict, "contribution.pose-name-already-pending"),
        // Adjustments (step B): the retained values follow the content rules of a pose (story 3).
        "le nom de la pose est obligatoire" => (HttpStatusCode.BadRequest, "pose.name-required"),
        "le nom de la pose est trop long" => (HttpStatusCode.BadRequest, "pose.name-too-long"),
        "le message est trop long" => (HttpStatusCode.BadRequest, "contribution.adjustment-note-too-long"),
        "un message n'accompagne qu'une acceptation avec ajustements" =>
            (HttpStatusCode.UnprocessableEntity, "contribution.adjustment-note-without-adjustment"),
        _ when reason.StartsWith("le niveau de difficulté \"", StringComparison.Ordinal) =>
            (HttpStatusCode.BadRequest, "pose.unknown-difficulty-level"),
        _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Motif d'impossibilité inconnu."),
    };

    private static Task ShouldBeAProblem(HttpResponseMessage? response, HttpStatusCode status, string code) =>
        ShouldBeAProblem(response, status, [code]);

    /// <summary>A ProblemDetails of this status whose code (<c>title</c>) is one of these, if any is given.</summary>
    private static async Task ShouldBeAProblem(HttpResponseMessage? response, HttpStatusCode status, string[] codes)
    {
        var received = response.ShouldNotBeNull();
        var body = await received.Content.ReadAsStringAsync();
        received.StatusCode.ShouldBe(status, body);
        received.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
        if (codes.Length == 0) return;

        JsonSerializer.Deserialize<JsonElement>(body).GetProperty("title").GetString()!.ShouldBeOneOf(codes);
    }

    private static async Task ShouldBeARefusedAttempt(HttpResponseMessage response)
    {
        var status = (int)response.StatusCode;
        var body = await response.Content.ReadAsStringAsync();
        status.ShouldBeInRange(400, 499, body);
        response.StatusCode.ShouldNotBe(HttpStatusCode.NotFound, body);
    }

    // --- HTTP ---------------------------------------------------------------------------------

    /// <summary>Without adjustment, every value is absent: each one is the proposed value.</summary>
    private static Task<HttpResponseMessage> Accept(HttpClient client, Guid proposal, AcceptanceRequest? acceptance = null) =>
        client.PostAsJsonAsync(
            new Uri($"/contribution/pose-proposals/{proposal}/acceptance", UriKind.Relative), acceptance ?? new AcceptanceRequest());

    /// <summary>
    /// « la difficulté flyer en "découverte" », « le nom en "Throne" », « le nom en un nom de 61 caractères »,
    /// « l'indicateur en « ne peut pas terminer un flow » »: only the adjusted value is sent, the others are absent.
    /// </summary>
    private static AcceptanceRequest Adjusting(string adjustment)
    {
        if (Regex.Match(adjustment, @"^la difficulté (base|flyer) en ""([^""]*)""$") is { Success: true } difficulty)
        {
            var code = DifficultyLabels.ToCodeOrAsIs(difficulty.Groups[2].Value);
            return difficulty.Groups[1].Value == "base" ? new AcceptanceRequest { BaseDifficulty = code } : new AcceptanceRequest { FlyerDifficulty = code };
        }

        if (Regex.Match(adjustment, @"^le nom en ""([^""]*)""$") is { Success: true } name) return new AcceptanceRequest { Name = name.Groups[1].Value };
        if (Regex.Match(adjustment, @"^le nom en un nom de (\d+) caractères$") is { Success: true } longName)
        {
            var length = int.Parse(longName.Groups[1].Value, CultureInfo.InvariantCulture);
            return new AcceptanceRequest { Name = "Pose " + new string('x', length - "Pose ".Length) };
        }

        if (Regex.Match(adjustment, "^l'indicateur en « (peut|ne peut pas) (commencer|terminer) un flow »$") is { Success: true } flow)
        {
            var can = flow.Groups[1].Value == "peut";
            return flow.Groups[2].Value == "commencer" ? new AcceptanceRequest { CanStartFlow = can } : new AcceptanceRequest { CanEndFlow = can };
        }

        throw new ArgumentOutOfRangeException(nameof(adjustment), adjustment, "Ajustement inconnu.");
    }

    private static Task<HttpResponseMessage> Reject(HttpClient client, Guid proposal, RejectionRequest rejection) =>
        client.PostAsJsonAsync(new Uri($"/contribution/pose-proposals/{proposal}/rejection", UriKind.Relative), rejection);

    private async Task<QueueResponse> Queue()
    {
        var response = _consultation.ShouldNotBeNull();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await Body<QueueResponse>(response)).ShouldNotBeNull();
    }

    private async Task<AcceptedResponse> Accepted()
    {
        var response = _decision.ShouldNotBeNull();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var accepted = (await Body<AcceptedResponse>(response)).ShouldNotBeNull();
        accepted.Status.ShouldBe("accepted");
        return accepted;
    }

    /// <summary>Read as a string, so that another step can read the same response again.</summary>
    private static async Task<T?> Body<T>(HttpResponseMessage response) =>
        JsonSerializer.Deserialize<T>(await response.Content.ReadAsStringAsync(), JsonSerializerOptions.Web);

    /// <summary>A reason of exactly this length, without superfluous spaces.</summary>
    private static string AReasonOfLength(int length) => "Doublon " + new string('x', length - "Doublon ".Length);

    /// <summary>An adjustment note of exactly this length, without superfluous spaces.</summary>
    private static string ANoteOfLength(int length) => "Corrigé " + new string('x', length - "Corrigé ".Length);

    // Black-box view of the HTTP contract (deliberately not the Api types). Nullable members so that a missing
    // field fails the comparison instead of reading as a default value.
    private sealed record QueueResponse(IReadOnlyList<QueuedProposalResponse> Proposals);

    private sealed record QueuedProposalResponse(
        Guid Id,
        string Name,
        string? BaseDifficulty,
        string? FlyerDifficulty,
        bool? CanStartFlow,
        bool? CanEndFlow,
        ContributorResponse? Contributor,
        DateTimeOffset? SubmittedAt);

    private sealed record ContributorResponse(string? Email, bool? IsYou);

    private sealed record CountResponse(int Count);

    private sealed record RejectionRequest(string? Reason);

    /// <summary>The acceptance: each adjusted value, the others absent (null), and the optional adjustment note.</summary>
    private sealed record AcceptanceRequest
    {
        public string? Name { get; init; }

        public string? BaseDifficulty { get; init; }

        public string? FlyerDifficulty { get; init; }

        public bool? CanStartFlow { get; init; }

        public bool? CanEndFlow { get; init; }

        public string? Message { get; init; }
    }

    private sealed record AcceptedResponse(
        Guid Id, string Status, bool? Adjusted, string Name, string BaseDifficulty, string FlyerDifficulty, bool? CanStartFlow, bool? CanEndFlow);

    private sealed record RejectedResponse(Guid Id, string Status);

    private sealed record PresentedProposal(
        string Name, string? BaseDifficulty, string? FlyerDifficulty, bool? CanStartFlow, bool? CanEndFlow, string? ContributorEmail, string? SubmittedOn);
}
