using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Contribution;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Contribution;

[Binding]
public sealed class PoseProposalSteps(People people, Deployment deployment, ScenarioProposals proposals, ScenarioClock clock, ScenarioResponses responses)
{
    private static readonly Uri PoseProposals = new("/contribution/pose-proposals", UriKind.Relative);

    // --- Proposing ----------------------------------------------------------------------------

    [When(@"^(\w+) propose la pose ""([^""]*)"" de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)""$")]
    public async Task WhenSomeoneProposesAPose(string name, string pose, string baseDifficulty, string flyerDifficulty) =>
        responses.Last = await Propose(name, AValidProposal(pose) with
        {
            BaseDifficulty = DifficultyLabels.ToCodeOrAsIs(baseDifficulty),
            FlyerDifficulty = DifficultyLabels.ToCodeOrAsIs(flyerDifficulty),
        });

    [Given(@"^(\w+) a proposé la pose ""([^""]*)"" de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)""$")]
    public async Task GivenSomeoneHasProposedAPose(string name, string pose, string baseDifficulty, string flyerDifficulty)
    {
        await WhenSomeoneProposesAPose(name, pose, baseDifficulty, flyerDifficulty);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.Created, await responses.Last.Content.ReadAsStringAsync());
    }

    [When(@"^un visiteur propose la pose ""([^""]*)"" de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)""$")]
    public async Task WhenAVisitorProposesAPose(string pose, string baseDifficulty, string flyerDifficulty)
    {
        using var visitor = deployment.Current.CreateClient();
        responses.Last = await visitor.PostAsJsonAsync(PoseProposals, AValidProposal(pose) with
        {
            BaseDifficulty = DifficultyLabels.ToCode(baseDifficulty),
            FlyerDifficulty = DifficultyLabels.ToCode(flyerDifficulty),
        });
    }

    [When(@"^(\w+) propose une pose nommée ""([^""]*)""$")]
    public async Task WhenSomeoneProposesAPoseNamed(string name, string pose) =>
        responses.Last = await Propose(name, AValidProposal(pose));

    /// <summary>An attempt that the API refused as inadmissible (400), not one that failed for another reason.</summary>
    [Given(@"^(\w+) a tenté de proposer une pose nommée ""([^""]*)""$")]
    public async Task GivenSomeoneHasTriedToProposeAPoseNamed(string name, string pose)
    {
        await WhenSomeoneProposesAPoseNamed(name, pose);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.BadRequest, await responses.Last.Content.ReadAsStringAsync());
    }

    [When(@"^(\w+) propose une pose dont le nom compte (\d+) caractères$")]
    public Task WhenSomeoneProposesAPoseWhoseNameHasLength(string name, int length) =>
        WhenSomeoneProposesAPoseNamed(name, "Pose " + new string('x', length - "Pose ".Length));

    [When(@"^(\w+) propose la pose ""([^""]*)"" sans (difficulté base|difficulté flyer)$")]
    public async Task WhenSomeoneProposesAPoseWithoutADifficulty(string name, string pose, string missing) =>
        responses.Last = await Propose(name, missing == "difficulté base"
            ? AValidProposal(pose) with { BaseDifficulty = null }
            : AValidProposal(pose) with { FlyerDifficulty = null });

    [When(@"^(\w+) propose la pose ""([^""]*)"" qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$")]
    public async Task WhenSomeoneProposesAPoseWithFlowBoundaries(string name, string pose, string canStart, string canEnd) =>
        responses.Last = await Propose(name, AValidProposal(pose) with { CanStartFlow = canStart == "peut", CanEndFlow = canEnd == "peut" });

    [Given(@"^(\w+) a proposé la pose ""([^""]*)"" qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$")]
    public async Task GivenSomeoneHasProposedAPoseWithFlowBoundaries(string name, string pose, string canStart, string canEnd)
    {
        await WhenSomeoneProposesAPoseWithFlowBoundaries(name, pose, canStart, canEnd);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.Created, await responses.Last.Content.ReadAsStringAsync());
    }

    [Given(@"^(\w+) a proposé le (\d{4}-\d{2}-\d{2}) la pose ""([^""]*)"" de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)"", qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$")]
    public async Task GivenSomeoneHasProposedAPoseOn(
        string name, string day, string pose, string baseDifficulty, string flyerDifficulty, string canStart, string canEnd)
    {
        clock.SetUtcNow(ScenarioClock.Parse(day));
        responses.Last = await Propose(name, new ProposalRequest(
            pose, DifficultyLabels.ToCode(baseDifficulty), DifficultyLabels.ToCode(flyerDifficulty), canStart == "peut", canEnd == "peut"));
        responses.Last.StatusCode.ShouldBe(HttpStatusCode.Created, await responses.Last.Content.ReadAsStringAsync());
    }

    [Given(@"^(\w+) a proposé le (\d{4}-\d{2}-\d{2}) la pose ""([^""]*)"" de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)""$")]
    public async Task GivenSomeoneHasProposedAPoseWithDifficultiesOn(string name, string day, string pose, string baseDifficulty, string flyerDifficulty)
    {
        clock.SetUtcNow(ScenarioClock.Parse(day));
        responses.Last = await Propose(
            name,
            AValidProposal(pose) with { BaseDifficulty = DifficultyLabels.ToCode(baseDifficulty), FlyerDifficulty = DifficultyLabels.ToCode(flyerDifficulty) });
        responses.Last.StatusCode.ShouldBe(HttpStatusCode.Created, await responses.Last.Content.ReadAsStringAsync());
    }

    /// <summary>Each contributor not met yet in the scenario is a user with the default address.</summary>
    [Given("les propositions suivantes sont en attente de validation :")]
    public async Task GivenTheProposalsArePending(DataTable pending)
    {
        foreach (var row in pending.Rows)
        {
            var name = row["contributeur"];
            if (!people.IsKnown(name)) (await people.Register(name, People.DefaultEmail(name))).EnsureSuccessStatusCode();

            clock.SetUtcNow(ScenarioClock.Parse(row["soumise le"]));
            responses.Last = await Propose(name, AValidProposal(row["pose"]));
            (await Received()).Status.ShouldBe("pending");
        }
    }

    [Given("aucune proposition n'est en attente de validation")]
    public static async Task GivenNoProposalIsPending() => (await PoseProposalsInDatabase.CountPending()).ShouldBe(0);

    [When(@"^(\w+) propose la pose ""([^""]*)"" sans préciser si elle peut (commencer|terminer) un flow$")]
    public async Task WhenSomeoneProposesAPoseWithoutAFlowBoundary(string name, string pose, string boundary) =>
        responses.Last = await Propose(name, boundary == "commencer"
            ? AValidProposal(pose) with { CanStartFlow = null }
            : AValidProposal(pose) with { CanEndFlow = null });

    // --- Outcome ------------------------------------------------------------------------------

    [Then(@"^la proposition de la pose ""([^""]*)"" par (\w+) est en attente de validation$")]
    public async Task ThenTheProposalOfThePoseIsPending(string pose, string name)
    {
        (await Received()).Status.ShouldBe("pending");
        (await PoseProposalsInDatabase.StatusesOf(people[name].Email, pose)).ShouldBe(["pending"]);
    }

    [Then(@"^la proposition d'(\w+) est en attente de validation$")]
    public async Task ThenTheProposalIsPending(string name)
    {
        var received = await Received();
        received.Status.ShouldBe("pending");
        (await PoseProposalsInDatabase.StatusesOf(people[name].Email, received.Name)).ShouldBe(["pending"]);
    }

    [Then(@"^aucune proposition d'(\w+) n'est en attente de validation$")]
    public async Task ThenNoProposalIsPending(string name) =>
        (await PoseProposalsInDatabase.StatusesOf(people[name].Email)).ShouldNotContain("pending");

    [Then(@"^la pose est proposée sous le nom ""([^""]*)""$")]
    public async Task ThenThePoseIsProposedUnderTheName(string pose) =>
        (await Received()).Name.ShouldBe(pose);

    [Then(@"^la pose ""([^""]*)"" est proposée avec la difficulté base ""([^""]*)"" et la difficulté flyer ""([^""]*)""$")]
    public async Task ThenThePoseIsProposedWithTheDifficulties(string pose, string baseDifficulty, string flyerDifficulty)
    {
        var received = await Received();
        received.Name.ShouldBe(pose);
        received.BaseDifficulty.ShouldBe(DifficultyLabels.ToCode(baseDifficulty));
        received.FlyerDifficulty.ShouldBe(DifficultyLabels.ToCode(flyerDifficulty));
    }

    [Then(@"^la pose proposée ""([^""]*)"" (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$")]
    public async Task ThenTheProposedPoseHasTheFlowBoundaries(string pose, string canStart, string canEnd)
    {
        var received = await Received();
        received.Name.ShouldBe(pose);
        received.CanStartFlow.ShouldBe(canStart == "peut");
        received.CanEndFlow.ShouldBe(canEnd == "peut");
    }

    [Then(@"^la proposition est irrecevable car (.+)$")]
    public async Task ThenTheProposalIsInadmissible(string reason)
    {
        var (status, code) = Inadmissibility(reason);
        var response = responses.Last.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(status, body);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
        if (code is null) return;

        var problem = JsonSerializer.Deserialize<JsonElement>(body);
        problem.GetProperty("title").GetString().ShouldBe(code);
        if (UnknownLevel(reason) is { } level) problem.GetProperty("detail").GetString().ShouldNotBeNull().ShouldContain(level);
    }

    private static (HttpStatusCode Status, string? Code) Inadmissibility(string reason) => reason switch
    {
        "il faut être connecté" => (HttpStatusCode.Unauthorized, null),
        "le compte n'existe plus et il faut se reconnecter" => (HttpStatusCode.Unauthorized, "identity.account-deleted"),
        "la pose est introuvable dans le catalogue" => (HttpStatusCode.NotFound, "contribution.pose-not-found"),
        "la pose de départ est obligatoire" => (HttpStatusCode.BadRequest, "contribution.from-pose-required"),
        "la pose d'arrivée est obligatoire" => (HttpStatusCode.BadRequest, "contribution.to-pose-required"),
        "la pose de départ est introuvable dans le catalogue" => (HttpStatusCode.NotFound, "contribution.from-pose-not-found"),
        "la pose d'arrivée est introuvable dans le catalogue" => (HttpStatusCode.NotFound, "contribution.to-pose-not-found"),
        "le nom de la transition doit contenir une lettre ou un chiffre" => (HttpStatusCode.BadRequest, "transition.name-without-letter-or-digit"),
        "le nom de la transition est trop long" => (HttpStatusCode.BadRequest, "transition.name-too-long"),
        "la description de la transition est trop longue" => (HttpStatusCode.BadRequest, "transition.description-too-long"),
        "une transition sans nom relie déjà ces poses dans le catalogue" => (HttpStatusCode.Conflict, "contribution.unnamed-transition-already-in-catalog"),
        "une transition sans nom entre ces poses est déjà en attente de validation" => (HttpStatusCode.Conflict, "contribution.unnamed-transition-already-pending"),
        "une transition de ce nom relie déjà ces poses dans le catalogue" => (HttpStatusCode.Conflict, "contribution.transition-name-already-in-catalog"),
        "une transition de ce nom entre ces poses est déjà en attente de validation" => (HttpStatusCode.Conflict, "contribution.transition-name-already-pending"),
        "la modification ne change rien à la pose" => (HttpStatusCode.UnprocessableEntity, "contribution.revision-changes-nothing"),
        "une modification de cette pose est déjà en attente de validation" => (HttpStatusCode.Conflict, "contribution.pose-revision-already-pending"),
        "le message de modification est trop long" => (HttpStatusCode.BadRequest, "contribution.revision-message-too-long"),
        "la pose a changé depuis le début de la modification" => (HttpStatusCode.Conflict, "contribution.pose-changed-since-revision-started"),
        "le nom de la pose est obligatoire" => (HttpStatusCode.BadRequest, "pose.name-required"),
        // Story 8: a proposed tag that is not in the list.
        _ when reason.StartsWith("l'étiquette ", StringComparison.Ordinal) && reason.EndsWith("n'est pas dans la liste des étiquettes", StringComparison.Ordinal) =>
            (HttpStatusCode.Conflict, "contribution.tag-not-in-list"),
        "le nom de la pose est trop long" => (HttpStatusCode.BadRequest, "pose.name-too-long"),
        "la difficulté base est obligatoire" => (HttpStatusCode.BadRequest, "pose.base-difficulty-required"),
        "la difficulté flyer est obligatoire" => (HttpStatusCode.BadRequest, "pose.flyer-difficulty-required"),
        "il faut préciser si la pose peut commencer un flow" => (HttpStatusCode.BadRequest, "pose.can-start-flow-required"),
        "il faut préciser si la pose peut terminer un flow" => (HttpStatusCode.BadRequest, "pose.can-end-flow-required"),
        "une pose de ce nom existe déjà dans le catalogue" => (HttpStatusCode.Conflict, "contribution.pose-name-already-in-catalog"),
        "une pose de ce nom est déjà en attente de validation" => (HttpStatusCode.Conflict, "contribution.pose-name-already-pending"),
        _ when UnknownLevel(reason) is not null => (HttpStatusCode.BadRequest, "pose.unknown-difficulty-level"),
        _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Motif d'irrecevabilité inconnu."),
    };

    /// <summary>"expert" in « le niveau de difficulté "expert" n'existe pas ».</summary>
    private static string? UnknownLevel(string reason) =>
        reason.StartsWith("le niveau de difficulté \"", StringComparison.Ordinal) && reason.EndsWith("\" n'existe pas", StringComparison.Ordinal)
            ? reason["le niveau de difficulté \"".Length..^"\" n'existe pas".Length]
            : null;

    // --- HTTP ---------------------------------------------------------------------------------

    /// <summary>Proposes and remembers the id of a received proposal, for the decision steps.</summary>
    private async Task<HttpResponseMessage> Propose(string name, ProposalRequest proposal)
    {
        var client = await people.SignedInClient(name);
        var response = await client.PostAsJsonAsync(PoseProposals, proposal);
        if (response.StatusCode == HttpStatusCode.Created && proposal.Name is not null)
        {
            // Read as a string: the steps that follow read the same response again.
            var received = JsonSerializer.Deserialize<ProposalResponse>(await response.Content.ReadAsStringAsync(), JsonSerializerOptions.Web)!;
            proposals.Received(name, proposal.Name, received.Id);
        }

        return response;
    }

    private async Task<ProposalResponse> Received()
    {
        var response = responses.Last.ShouldNotBeNull();
        response.StatusCode.ShouldBe(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<ProposalResponse>())!;
    }

    /// <summary>A proposal whose information is valid; each step only changes what it is about.</summary>
    private static ProposalRequest AValidProposal(string name) => new(name, "beginner", "discovery", CanStartFlow: true, CanEndFlow: true);

    // Black-box view of the HTTP contract (deliberately not the Api types).
    private sealed record ProposalRequest(string? Name, string? BaseDifficulty, string? FlyerDifficulty, bool? CanStartFlow, bool? CanEndFlow);

    private sealed record ProposalResponse(Guid Id, string Status, string Name, string BaseDifficulty, string FlyerDifficulty, bool CanStartFlow, bool CanEndFlow);
}
