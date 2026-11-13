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
/// Story 7 « Proposer une transition » through the HTTP contract (ADR 0028 to 0030): the steps find the poses in the catalog
/// list, as the website does, then send their identifiers. A transition is designated as in the Gherkin: « la transition
/// "Ninja Star" », « une transition sans nom », « une transition nommée "---" », « une transition au nom de 60 caractères »…
/// </summary>
[Binding]
public sealed partial class TransitionProposalSteps(
    People people, Deployment deployment, ScenarioProposals poseProposals, ScenarioResponses responses, ScenarioClock clock,
    ScenarioTransitionProposals transitionProposals)
{
    private const string Proposed =
        @"(la transition ""[^""]*""|une transition sans nom|une transition nommée (?:""[^""]*""|un nom de \d+ caractères)|une transition au nom de \d+ caractères)";

    private const string Designated = @"(la transition ""[^""]*""|la transition sans nom|la transition au nom de \d+ caractères)";
    private const string Poses = @"de ""([^""]*)"" vers ""([^""]*)""";
    private const string Difficulties = @"de difficulté base ""([^""]*)"" et de difficulté flyer ""([^""]*)""";
    private const string Text = @"« ?(.*?) ?»";

    private static readonly Uri TransitionProposals = new("/contribution/transition-proposals", UriKind.Relative);

    // --- Proposing ----------------------------------------------------------------------------

    [When(@"^(\w+) propose " + Proposed + " " + Poses + "$")]
    public async Task WhenSomeoneProposes(string name, string transition, string from, string to) =>
        responses.Last = await Propose(name, await Request(transition, from, to));

    /// <summary>
    /// « Alice a proposé [le 2026-11-14] la transition "Ninja Star" de "Star" vers "Star" [de difficulté base … et de difficulté
    /// flyer …][, avec la description « … »] »: received by the API.
    /// </summary>
    [Given(@"^(\w+) a proposé " + Proposed + " " + Poses + "$")]
    public Task GivenSomeoneHasProposed(string name, string transition, string from, string to) =>
        HasProposed(name, day: null, transition, from, to, baseDifficulty: null, flyerDifficulty: null, description: null);

    [Given(@"^(\w+) a proposé " + Proposed + " " + Poses + " " + Difficulties + "$")]
    public Task GivenSomeoneHasProposedWithDifficulties(string name, string transition, string from, string to, string baseDifficulty, string flyerDifficulty) =>
        HasProposed(name, day: null, transition, from, to, baseDifficulty, flyerDifficulty, description: null);

    [Given(@"^(\w+) a proposé " + Proposed + " " + Poses + " " + Difficulties + ", avec la description " + Text + "$")]
    public Task GivenSomeoneHasProposedWithDifficultiesAndADescription(
        string name, string transition, string from, string to, string baseDifficulty, string flyerDifficulty, string description) =>
        HasProposed(name, day: null, transition, from, to, baseDifficulty, flyerDifficulty, description);

    [Given(@"^(\w+) a proposé " + Proposed + " " + Poses + ", avec la description " + Text + "$")]
    public Task GivenSomeoneHasProposedWithADescription(string name, string transition, string from, string to, string description) =>
        HasProposed(name, day: null, transition, from, to, baseDifficulty: null, flyerDifficulty: null, description);

    [Given(@"^(\w+) a proposé le (\d{4}-\d{2}-\d{2}) " + Proposed + " " + Poses + "$")]
    public Task GivenSomeoneHasProposedOn(string name, string day, string transition, string from, string to) =>
        HasProposed(name, day, transition, from, to, baseDifficulty: null, flyerDifficulty: null, description: null);

    [Given(@"^(\w+) a proposé le (\d{4}-\d{2}-\d{2}) " + Proposed + " " + Poses + " " + Difficulties + ", avec la description " + Text + "$")]
    public Task GivenSomeoneHasProposedOnWithDifficultiesAndADescription(
        string name, string day, string transition, string from, string to, string baseDifficulty, string flyerDifficulty, string description) =>
        HasProposed(name, day, transition, from, to, baseDifficulty, flyerDifficulty, description);

    private async Task HasProposed(
        string name, string? day, string transition, string from, string to, string? baseDifficulty, string? flyerDifficulty, string? description)
    {
        if (!string.IsNullOrEmpty(day)) clock.SetUtcNow(ScenarioClock.Parse(day));
        var request = await Request(transition, from, to);
        if (baseDifficulty is not null && flyerDifficulty is not null)
            request = request with { BaseDifficulty = DifficultyLabels.ToCode(baseDifficulty), FlyerDifficulty = DifficultyLabels.ToCode(flyerDifficulty) };
        if (!string.IsNullOrEmpty(description)) request = request with { Description = description };
        responses.Last = await Propose(name, request);
        await ShouldBeReceived();
    }

    [When(@"^(\w+) propose " + Proposed + " " + Poses + " " + Difficulties + "$")]
    public async Task WhenSomeoneProposesWithDifficulties(string name, string transition, string from, string to, string baseDifficulty, string flyerDifficulty) =>
        responses.Last = await Propose(name, await Request(transition, from, to) with
        {
            BaseDifficulty = DifficultyLabels.ToCodeOrAsIs(baseDifficulty),
            FlyerDifficulty = DifficultyLabels.ToCodeOrAsIs(flyerDifficulty),
        });

    [When(@"^(\w+) propose " + Proposed + " " + Poses + " sans (difficulté base|difficulté flyer)$")]
    public async Task WhenSomeoneProposesWithoutADifficulty(string name, string transition, string from, string to, string missing)
    {
        var request = await Request(transition, from, to);
        responses.Last = await Propose(name, missing == "difficulté base" ? request with { BaseDifficulty = null } : request with { FlyerDifficulty = null });
    }

    [When(@"^(\w+) propose " + Proposed + " " + Poses + ", avec la description " + Text + "$")]
    public async Task WhenSomeoneProposesWithADescription(string name, string transition, string from, string to, string description) =>
        responses.Last = await Propose(name, await Request(transition, from, to) with { Description = description });

    [When(@"^(\w+) propose " + Proposed + " " + Poses + @", avec une description de (\d+) caractères$")]
    public async Task WhenSomeoneProposesWithADescriptionOfLength(string name, string transition, string from, string to, int length) =>
        responses.Last = await Propose(name, await Request(transition, from, to) with { Description = new string('x', length) });

    [When(@"^un visiteur propose " + Proposed + " " + Poses + "$")]
    public async Task WhenAVisitorProposes(string transition, string from, string to)
    {
        using var visitor = deployment.Current.CreateClient();
        responses.Last = await visitor.PostAsJsonAsync(TransitionProposals, await Request(transition, from, to));
    }

    [When(@"^(\w+) propose une transition sans (pose de départ|pose d'arrivée)$")]
    public async Task WhenSomeoneProposesATransitionWithoutAPose(string name, string missing)
    {
        var request = await Between("Throne", "Bird");
        responses.Last = await Propose(name, missing == "pose de départ" ? request with { FromPoseId = null } : request with { ToPoseId = null });
    }

    [When(@"^(\w+) propose une transition dont la (pose de départ|pose d'arrivée) n'existe pas dans le catalogue$")]
    public async Task WhenSomeoneProposesATransitionWithAnUnknownPose(string name, string unknown)
    {
        var request = await Between("Throne", "Bird");
        responses.Last = await Propose(
            name, unknown == "pose de départ" ? request with { FromPoseId = Guid.NewGuid() } : request with { ToPoseId = Guid.NewGuid() });
    }

    // --- Outcome ------------------------------------------------------------------------------

    [Then(@"^la proposition de " + Designated + " " + Poses + @" par (\w+) est en attente de validation$")]
    public async Task ThenTheProposalIsPending(string transition, string from, string to, string name)
    {
        var expected = NameIn(transition);
        var received = await ShouldBeReceived();
        received.ShouldSatisfyAllConditions(
            r => r.Status.ShouldBe("pending"),
            r => r.Name.ShouldBe(expected),
            r => r.FromPose.Name.ShouldBe(from),
            r => r.ToPose.Name.ShouldBe(to));
        (await Stored(name, from, to)).Select(p => (p.Status, p.Name)).ShouldBe([("pending", expected)]);
    }

    [Then(@"^la proposition de " + Designated + " " + Poses + @" par (\w+) porte la description " + Text + "$")]
    public async Task ThenTheProposalHasTheDescription(string transition, string from, string to, string name, string description)
    {
        (await ShouldBeReceived()).Description.ShouldBe(description);
        (await Stored(name, from, to)).Where(p => p.Name == NameIn(transition)).ShouldHaveSingleItem().Description.ShouldBe(description);
    }

    [Then(@"^la proposition de " + Designated + " " + Poses + @" par (\w+) ne porte aucune description$")]
    public async Task ThenTheProposalHasNoDescription(string transition, string from, string to, string name)
    {
        (await ShouldBeReceived()).Description.ShouldBeNull();
        (await Stored(name, from, to)).Where(p => p.Name == NameIn(transition)).ShouldHaveSingleItem().Description.ShouldBeNull();
    }

    [Then(@"^la transition est proposée sous le nom ""([^""]*)""$")]
    public async Task ThenTheTransitionIsProposedUnderTheName(string transition) =>
        (await ShouldBeReceived()).Name.ShouldBe(transition);

    // --- Designations -------------------------------------------------------------------------

    /// <summary>The name sent or expected for a designation of the Gherkin; none for « sans nom ».</summary>
    private static string? NameIn(string designation)
    {
        if (designation.EndsWith("sans nom", StringComparison.Ordinal)) return null;
        if (QuotedName().Match(designation) is { Success: true } quoted) return quoted.Groups[1].Value;
        var length = int.Parse(NameLength().Match(designation).Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture);
        return "Transition " + new string('x', length - "Transition ".Length);
    }

    [GeneratedRegex(@"""([^""]*)""")]
    private static partial Regex QuotedName();

    [GeneratedRegex(@"nom de (\d+) caractères")]
    private static partial Regex NameLength();

    // --- HTTP ---------------------------------------------------------------------------------

    /// <summary>Proposes and remembers the id of a received proposal, for the decision steps.</summary>
    private async Task<HttpResponseMessage> Propose(string name, TransitionProposalRequest request)
    {
        var client = await people.SignedInClient(name);
        var response = await client.PostAsJsonAsync(TransitionProposals, request);
        if (response.StatusCode == HttpStatusCode.Created)
        {
            // Read as a string: the steps that follow read the same response again.
            var received = JsonSerializer.Deserialize<TransitionProposalResponse>(await response.Content.ReadAsStringAsync(), JsonSerializerOptions.Web)!;
            transitionProposals.Received(name, received.FromPose.Name, received.ToPose.Name, request.Name is null ? null : received.Name, received.Id);
        }

        return response;
    }

    private async Task<TransitionProposalResponse> ShouldBeReceived()
    {
        var response = responses.Last.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.Created, body);
        return JsonSerializer.Deserialize<TransitionProposalResponse>(body, JsonSerializerOptions.Web)!;
    }

    private Task<IReadOnlyList<RecordedTransitionProposal>> Stored(string contributor, string from, string to) =>
        TransitionProposalsInDatabase.Of(people[contributor].Email, from, to);

    private async Task<TransitionProposalRequest> Request(string designation, string from, string to) =>
        await Between(from, to) with { Name = NameIn(designation) };

    /// <summary>
    /// A valid transition between two poses (beginner / beginner, no name, no description); each step only changes what it is
    /// about. A pose still pending validation has no catalog identifier: its proposal identifier is sent, as unknown to the catalog.
    /// </summary>
    private async Task<TransitionProposalRequest> Between(string from, string to)
    {
        using var visitor = deployment.Current.CreateClient();
        var list = await visitor.GetFromJsonAsync<PoseListResponse>(new Uri("/catalog/poses", UriKind.Relative));
        Guid IdOf(string pose) =>
            list!.Poses.SingleOrDefault(p => p.Name == pose)?.Id
            ?? poseProposals.AnyIdOf(pose)
            ?? throw new InvalidOperationException($"La pose « {pose} » n'est ni publiée ni proposée dans ce scénario.");
        return new TransitionProposalRequest(IdOf(from), IdOf(to), Name: null, "beginner", "beginner", Description: null);
    }

    // Black-box view of the HTTP contract (deliberately not the Api types).
    private sealed record TransitionProposalRequest(
        Guid? FromPoseId, Guid? ToPoseId, string? Name, string? BaseDifficulty, string? FlyerDifficulty, string? Description);

    private sealed record PoseReference(Guid Id, string Name);

    private sealed record TransitionProposalResponse(
        Guid Id, string Status, PoseReference FromPose, PoseReference ToPose, string? Name, string BaseDifficulty, string FlyerDifficulty, string? Description);

    private sealed record PoseListResponse(IReadOnlyList<PoseSummaryResponse> Poses);

    private sealed record PoseSummaryResponse(Guid Id, string Name);
}
