using System.Net;
using System.Text.Json;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Contribution;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Contribution;

/// <summary>
/// « Mes propositions » (story 5, ADR 0023): what a contributor sees of the proposals they submitted, through the HTTP
/// contract described in docs/domain/context-map.md.
/// </summary>
[Binding]
public sealed class MyProposalsSteps(People people, Deployment deployment, Consultation consultation)
{
    private const string OfThePose = @"la proposition de la pose ""([^""]*)""";
    private const string Text = @"« ?(.*?) ?»";
    private const string Day = @"(\d{4}-\d{2}-\d{2})";

    private static readonly Uri MyPoseProposals = new("/contribution/my-pose-proposals", UriKind.Relative);

    /// <summary>The person who consulted their proposals in this scenario.</summary>
    private string? _consulter;

    // --- Consulting ---------------------------------------------------------------------------

    [When(@"^(\w+) consulte ses propositions$")]
    public async Task WhenSomeoneConsultsTheirProposals(string name)
    {
        _consulter = name;
        consultation.Response = await (await people.SignedInClient(name)).GetAsync(MyPoseProposals);
    }

    [When("un visiteur consulte ses propositions")]
    public async Task WhenAVisitorConsultsTheirProposals()
    {
        using var visitor = deployment.Current.CreateClient();
        consultation.Response = await visitor.GetAsync(MyPoseProposals);
    }

    // --- The list -----------------------------------------------------------------------------

    [Then("ses propositions présentent exactement les poses suivantes :")]
    public async Task ThenTheProposalsPresentExactlyThePoses(DataTable expected) =>
        (await MyProposals()).Select(p => p.Name).ShouldBe(expected.Rows.Select(row => row["pose"]), ignoreOrder: true);

    [Then(@"^(\w+) est informée? qu'(?:elle|il) n'a encore proposé aucune pose$")]
    public async Task ThenNothingWasProposed(string name)
    {
        // Through the API, the list is empty: the message itself is the front's concern (ADR 0007).
        name.ShouldBe(_consulter);
        (await MyProposals()).ShouldBeEmpty();
    }

    /// <summary>Only the columns of the table are compared: each scenario shows what its rule is about.</summary>
    [Then("ses propositions présentent exactement les propositions suivantes :")]
    public async Task ThenTheProposalsPresentExactly(DataTable expected)
    {
        var columns = expected.Header.ToList();
        var presented = (await MyProposals()).Select(p => string.Join(" | ", columns.Select(column => column + " = " + Presented(p, column))));

        presented.ShouldBe(
            expected.Rows.Select(row => string.Join(" | ", columns.Select(column => column + " = " + Expected(row, column)))),
            ignoreOrder: true);
    }

    [Then(@"^les propositions (?:d'|de )(\w+) ont les statuts suivants :$")]
    public async Task ThenTheProposalsHaveTheStatuses(string name, DataTable expected)
    {
        name.ShouldBe(_consulter);
        (await MyProposals()).Select(p => (p.Name, p.Status))
            .ShouldBe(expected.Rows.Select(row => (row["pose"], (string?)StatusCode(row["statut"]))), ignoreOrder: true);
    }

    [Then("ses propositions sont présentées dans cet ordre :")]
    public async Task ThenTheProposalsArePresentedInOrder(DataTable expected) =>
        (await MyProposals()).Select(p => p.Name).ShouldBe(expected.Rows.Select(row => row["pose"]));

    // --- One proposal -------------------------------------------------------------------------

    [Then("^" + OfThePose + @" est présentée à (\w+) comme acceptée le " + Day + "$")]
    public async Task ThenTheProposalIsPresentedAsAcceptedOn(string pose, string name, string day)
    {
        name.ShouldBe(_consulter);
        var proposal = await MyProposal(pose);
        proposal.Status.ShouldBe("accepted");
        ScenarioClock.DayOf(proposal.DecidedAt.ShouldNotBeNull()).ShouldBe(day);
    }

    [Then("^" + OfThePose + @" est présentée à (\w+) comme publiée directement, sans date de décision$")]
    public async Task ThenTheProposalIsPresentedAsPublishedDirectly(string pose, string name)
    {
        name.ShouldBe(_consulter);
        var proposal = await MyProposal(pose);
        proposal.Status.ShouldBe("published-directly");
        proposal.DecidedAt.ShouldBeNull();
    }

    [Then("^" + OfThePose + @" est présentée à (\w+) comme acceptée, sans ajustement$")]
    public async Task ThenTheProposalIsPresentedAsAcceptedWithoutAdjustment(string pose, string name)
    {
        name.ShouldBe(_consulter);
        var proposal = await MyProposal(pose);
        proposal.Status.ShouldBe("accepted");
        proposal.Adjustments.ShouldBeNull();
        proposal.Message.ShouldBeNull();
    }

    [Then("^" + OfThePose + @", proposée sous le nom ""([^""]*)"", présente exactement les ajustements suivants :$")]
    public async Task ThenTheRenamedProposalPresentsExactlyTheAdjustments(string pose, string proposedName, DataTable expected)
    {
        (await MyProposal(pose)).Adjustments.ShouldNotBeNull().Name.ShouldNotBeNull().Proposed.ShouldBe(proposedName);
        await ThenTheProposalPresentsExactlyTheAdjustments(pose, expected);
    }

    [Then("^" + OfThePose + " présente exactement les ajustements suivants :$")]
    public async Task ThenTheProposalPresentsExactlyTheAdjustments(string pose, DataTable expected)
    {
        var proposal = await MyProposal(pose);
        proposal.Status.ShouldBe("accepted-with-adjustments");
        var adjustments = proposal.Adjustments.ShouldNotBeNull();

        PresentedAdjustments(adjustments).ShouldBe(
            expected.Rows.Select(row => (row["champ"], ExpectedValue(row["champ"], row["proposé"]), ExpectedValue(row["champ"], row["retenu"]))),
            ignoreOrder: true);
    }

    [Then("^" + OfThePose + " présente le message d'ajustement " + Text + "$")]
    public async Task ThenTheProposalPresentsTheAdjustmentNote(string pose, string note)
    {
        var proposal = await MyProposal(pose);
        proposal.Status.ShouldBe("accepted-with-adjustments");
        proposal.Message.ShouldBe(note);
    }

    [Then("^" + OfThePose + " ne présente aucun message d'ajustement$")]
    public async Task ThenTheProposalPresentsNoAdjustmentNote(string pose)
    {
        var proposal = await MyProposal(pose);
        proposal.Status.ShouldBe("accepted-with-adjustments");
        proposal.Message.ShouldBeNull();
    }

    [Then("^" + OfThePose + " présente le motif de refus " + Text + "$")]
    public async Task ThenTheProposalPresentsTheRejectionReason(string pose, string reason)
    {
        var proposal = await MyProposal(pose);
        proposal.Status.ShouldBe("rejected");
        proposal.Reason.ShouldBe(reason);
    }

    /// <summary>
    /// Neither the address nor the identifier of the validator who decided appears in the proposal, which only has the
    /// members of the contract (no « decidedBy », no « isYou »).
    /// </summary>
    [Then("^" + OfThePose + " ne désigne pas le validateur qui l'a traitée$")]
    public async Task ThenTheProposalDoesNotDesignateTheValidator(string pose)
    {
        var proposal = (await MyProposalElements()).Single(p => p.GetProperty("name").GetString() == pose);
        var decider = await PoseProposalsInDatabase.DeciderOf(proposal.GetProperty("id").GetGuid());
        var json = proposal.GetRawText();

        decider.ShouldSatisfyAllConditions(
            () => proposal.EnumerateObject().Select(member => member.Name).ShouldBeSubsetOf(ContractMembers),
            () => json.ShouldNotContain(decider.Email, Case.Insensitive),
            () => json.ShouldNotContain(decider.Id.ToString(), Case.Insensitive));
    }

    // --- HTTP ---------------------------------------------------------------------------------

    private static readonly string[] ContractMembers =
    [
        "id", "status", "name", "baseDifficulty", "flyerDifficulty", "canStartFlow", "canEndFlow", "submittedAt", "decidedAt",
        "adjustments", "message", "reason",
    ];

    private async Task<string> SuccessfulBody()
    {
        var response = consultation.Response.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        return body;
    }

    private async Task<IReadOnlyList<MyProposalResponse>> MyProposals() =>
        JsonSerializer.Deserialize<MyProposalsResponse>(await SuccessfulBody(), JsonSerializerOptions.Web).ShouldNotBeNull().Proposals;

    private async Task<IReadOnlyList<JsonElement>> MyProposalElements() =>
        [.. JsonSerializer.Deserialize<JsonElement>(await SuccessfulBody()).GetProperty("proposals").EnumerateArray()];

    private async Task<MyProposalResponse> MyProposal(string pose) =>
        (await MyProposals()).Where(p => p.Name == pose).ShouldHaveSingleItem();

    // --- Translation between the Gherkin and the contract -------------------------------------

    private static string? Presented(MyProposalResponse proposal, string column) => column switch
    {
        "pose" => proposal.Name,
        "difficulté base" => proposal.BaseDifficulty,
        "difficulté flyer" => proposal.FlyerDifficulty,
        "commencer" => Can(proposal.CanStartFlow),
        "terminer" => Can(proposal.CanEndFlow),
        "soumise le" => proposal.SubmittedAt is { } submittedAt ? ScenarioClock.DayOf(submittedAt) : null,
        _ => throw new ArgumentOutOfRangeException(nameof(column), column, "Colonne inconnue."),
    };

    private static string Expected(DataTableRow row, string column) => column switch
    {
        "difficulté base" or "difficulté flyer" => DifficultyLabels.ToCode(row[column]),
        _ => row[column],
    };

    private static string? Can(bool? can) => can switch
    {
        true => "peut",
        false => "ne peut pas",
        null => null,
    };

    private static string StatusCode(string label) => label switch
    {
        "en attente de validation" => "pending",
        "acceptée" => "accepted",
        "acceptée avec ajustements" => "accepted-with-adjustments",
        "refusée" => "rejected",
        "publiée directement" => "published-directly",
        _ => throw new ArgumentOutOfRangeException(nameof(label), label, "Statut inconnu."),
    };

    /// <summary>Each adjusted field (the others are null), with its proposed and retained values, as written in the Gherkin.</summary>
    private static IEnumerable<(string Field, string? Proposed, string? Retained)> PresentedAdjustments(AdjustmentsResponse adjustments)
    {
        if (adjustments.Name is { } name) yield return ("nom", name.Proposed, name.Retained);
        if (adjustments.BaseDifficulty is { } baseDifficulty) yield return ("difficulté base", baseDifficulty.Proposed, baseDifficulty.Retained);
        if (adjustments.FlyerDifficulty is { } flyerDifficulty) yield return ("difficulté flyer", flyerDifficulty.Proposed, flyerDifficulty.Retained);
        if (adjustments.CanStartFlow is { } canStart) yield return ("peut commencer un flow", Can(canStart.Proposed), Can(canStart.Retained));
        if (adjustments.CanEndFlow is { } canEnd) yield return ("peut terminer un flow", Can(canEnd.Proposed), Can(canEnd.Retained));
    }

    private static string? ExpectedValue(string field, string value) => field switch
    {
        "difficulté base" or "difficulté flyer" => DifficultyLabels.ToCode(value),
        _ => value,
    };

    // Black-box view of the HTTP contract (deliberately not the Api types). Nullable members so that a missing
    // field fails the comparison instead of reading as a default value.
    private sealed record MyProposalsResponse(IReadOnlyList<MyProposalResponse> Proposals);

    private sealed record MyProposalResponse(
        Guid Id,
        string? Status,
        string Name,
        string? BaseDifficulty,
        string? FlyerDifficulty,
        bool? CanStartFlow,
        bool? CanEndFlow,
        DateTimeOffset? SubmittedAt,
        DateTimeOffset? DecidedAt,
        AdjustmentsResponse? Adjustments,
        string? Message,
        string? Reason);

    private sealed record AdjustmentsResponse(
        Change<string>? Name,
        Change<string>? BaseDifficulty,
        Change<string>? FlyerDifficulty,
        Change<bool?>? CanStartFlow,
        Change<bool?>? CanEndFlow);

    private sealed record Change<T>(T Proposed, T Retained);
}
