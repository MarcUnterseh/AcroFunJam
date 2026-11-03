using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Contribution;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Contribution;

[Binding]
public sealed class PoseProposalSteps(People people, Deployment deployment)
{
    private static readonly Uri PoseProposals = new("/contribution/pose-proposals", UriKind.Relative);

    private HttpResponseMessage? _lastResponse;

    // --- Proposing ----------------------------------------------------------------------------

    [When(@"^(\w+) propose la pose ""([^""]*)"" de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)""$")]
    public async Task WhenSomeoneProposesAPose(string name, string pose, string baseDifficulty, string flyerDifficulty) =>
        _lastResponse = await Propose(name, AValidProposal(pose) with
        {
            BaseDifficulty = DifficultyLabels.ToCodeOrAsIs(baseDifficulty),
            FlyerDifficulty = DifficultyLabels.ToCodeOrAsIs(flyerDifficulty),
        });

    [Given(@"^(\w+) a proposé la pose ""([^""]*)"" de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)""$")]
    public async Task GivenSomeoneHasProposedAPose(string name, string pose, string baseDifficulty, string flyerDifficulty)
    {
        await WhenSomeoneProposesAPose(name, pose, baseDifficulty, flyerDifficulty);
        _lastResponse!.StatusCode.ShouldBe(HttpStatusCode.Created, await _lastResponse.Content.ReadAsStringAsync());
    }

    [When(@"^un visiteur propose la pose ""([^""]*)"" de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)""$")]
    public async Task WhenAVisitorProposesAPose(string pose, string baseDifficulty, string flyerDifficulty)
    {
        using var visitor = deployment.Current.CreateClient();
        _lastResponse = await visitor.PostAsJsonAsync(PoseProposals, AValidProposal(pose) with
        {
            BaseDifficulty = DifficultyLabels.ToCode(baseDifficulty),
            FlyerDifficulty = DifficultyLabels.ToCode(flyerDifficulty),
        });
    }

    [When(@"^(\w+) propose une pose nommée ""([^""]*)""$")]
    public async Task WhenSomeoneProposesAPoseNamed(string name, string pose) =>
        _lastResponse = await Propose(name, AValidProposal(pose));

    /// <summary>An attempt that the API refused as inadmissible (400), not one that failed for another reason.</summary>
    [Given(@"^(\w+) a tenté de proposer une pose nommée ""([^""]*)""$")]
    public async Task GivenSomeoneHasTriedToProposeAPoseNamed(string name, string pose)
    {
        await WhenSomeoneProposesAPoseNamed(name, pose);
        _lastResponse!.StatusCode.ShouldBe(HttpStatusCode.BadRequest, await _lastResponse.Content.ReadAsStringAsync());
    }

    [When(@"^(\w+) propose une pose dont le nom compte (\d+) caractères$")]
    public Task WhenSomeoneProposesAPoseWhoseNameHasLength(string name, int length) =>
        WhenSomeoneProposesAPoseNamed(name, "Pose " + new string('x', length - "Pose ".Length));

    [When(@"^(\w+) propose la pose ""([^""]*)"" sans (difficulté base|difficulté flyer)$")]
    public async Task WhenSomeoneProposesAPoseWithoutADifficulty(string name, string pose, string missing) =>
        _lastResponse = await Propose(name, missing == "difficulté base"
            ? AValidProposal(pose) with { BaseDifficulty = null }
            : AValidProposal(pose) with { FlyerDifficulty = null });

    [When(@"^(\w+) propose la pose ""([^""]*)"" qui (peut|ne peut pas) commencer un flow et (peut|ne peut pas) terminer un flow$")]
    public async Task WhenSomeoneProposesAPoseWithFlowBoundaries(string name, string pose, string canStart, string canEnd) =>
        _lastResponse = await Propose(name, AValidProposal(pose) with { CanStartFlow = canStart == "peut", CanEndFlow = canEnd == "peut" });

    [When(@"^(\w+) propose la pose ""([^""]*)"" sans préciser si elle peut (commencer|terminer) un flow$")]
    public async Task WhenSomeoneProposesAPoseWithoutAFlowBoundary(string name, string pose, string boundary) =>
        _lastResponse = await Propose(name, boundary == "commencer"
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
        var response = _lastResponse.ShouldNotBeNull();
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
        "le nom de la pose est obligatoire" => (HttpStatusCode.BadRequest, "pose.name-required"),
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

    private async Task<HttpResponseMessage> Propose(string name, ProposalRequest proposal) =>
        await (await people.SignedInClient(name)).PostAsJsonAsync(PoseProposals, proposal);

    private async Task<ProposalResponse> Received()
    {
        var response = _lastResponse.ShouldNotBeNull();
        response.StatusCode.ShouldBe(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<ProposalResponse>())!;
    }

    /// <summary>A proposal whose information is valid; each step only changes what it is about.</summary>
    private static ProposalRequest AValidProposal(string name) => new(name, "beginner", "discovery", CanStartFlow: true, CanEndFlow: true);

    // Black-box view of the HTTP contract (deliberately not the Api types).
    private sealed record ProposalRequest(string? Name, string? BaseDifficulty, string? FlyerDifficulty, bool? CanStartFlow, bool? CanEndFlow);

    private sealed record ProposalResponse(Guid Id, string Status, string Name, string BaseDifficulty, string FlyerDifficulty, bool CanStartFlow, bool CanEndFlow);
}
