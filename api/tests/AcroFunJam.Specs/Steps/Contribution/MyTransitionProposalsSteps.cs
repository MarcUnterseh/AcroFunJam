using System.Net;
using System.Text.Json;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Contribution;

/// <summary>
/// Story 7: the transitions of a contributor in « Mes propositions » (kind <c>transition-proposal</c>, ADR 0030): the retained
/// transition once accepted, the proposed one otherwise, its poses under their current names.
/// </summary>
[Binding]
public sealed class MyTransitionProposalsSteps(Consultation consultation)
{
    private const string Transition = @"la transition (sans nom|""[^""]*"") de ""([^""]*)"" vers ""([^""]*)""";
    private const string Text = @"« ?(.*?) ?»";

    [Then("ses propositions présentent exactement les transitions suivantes :")]
    public async Task ThenTheProposalsPresentExactlyTheTransitions(DataTable expected) =>
        (await MyTransitions()).Select(t => new Presented(
                t.FromPose?.Name, t.ToPose?.Name, t.Name, t.BaseDifficulty, t.FlyerDifficulty, t.Description, t.Status,
                t.SubmittedAt is { } submittedAt ? ScenarioClock.DayOf(submittedAt) : null))
            .ShouldBe(expected.Rows.Select(row => new Presented(
                row["pose de départ"], row["pose d'arrivée"], Blank(row["nom"]), DifficultyLabels.ToCode(row["difficulté base"]),
                DifficultyLabels.ToCode(row["difficulté flyer"]), Blank(row["description"]), StatusCode(row["statut"]), row["soumise le"])));

    [Then("^ses propositions présentent " + Transition + "$")]
    public async Task ThenTheProposalsPresentTheTransition(string transition, string from, string to) => await MyTransition(transition, from, to);

    [Then("^" + Transition + " présente l'ajustement de la description " + Text + " → " + Text + "$")]
    public async Task ThenTheTransitionPresentsTheDescriptionAdjustment(string transition, string from, string to, string proposed, string retained)
    {
        var mine = await MyTransition(transition, from, to);
        mine.Status.ShouldBe("accepted-with-adjustments");
        mine.Adjustments.ShouldBe(new AdjustmentsResponse(Name: null, BaseDifficulty: null, FlyerDifficulty: null, new Change(proposed, retained)));
        mine.Description.ShouldBe(retained);
    }

    [Then("^" + Transition + " est présentée comme refusée avec le motif " + Text + "$")]
    public async Task ThenTheTransitionIsPresentedAsRejected(string transition, string from, string to, string reason)
    {
        var mine = await MyTransition(transition, from, to);
        mine.Status.ShouldBe("rejected");
        mine.Reason.ShouldBe(reason);
        mine.DecidedAt.ShouldNotBeNull();
    }

    [Then("^" + Transition + " est présentée comme publiée directement$")]
    public async Task ThenTheTransitionIsPresentedAsPublishedDirectly(string transition, string from, string to)
    {
        var mine = await MyTransition(transition, from, to);
        mine.Status.ShouldBe("published-directly");
        mine.DecidedAt.ShouldBeNull();
    }

    // --- HTTP ---------------------------------------------------------------------------------

    private async Task<MyTransitionResponse> MyTransition(string transition, string from, string to)
    {
        var name = transition == "sans nom" ? null : transition.Trim('"');
        return (await MyTransitions()).Where(t => t.FromPose?.Name == from && t.ToPose?.Name == to && t.Name == name).ShouldHaveSingleItem();
    }

    private async Task<IReadOnlyList<MyTransitionResponse>> MyTransitions()
    {
        var response = consultation.Response.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        return [.. JsonSerializer.Deserialize<MyProposalsResponse>(body, JsonSerializerOptions.Web)!.Proposals.Where(p => p.Kind == "transition-proposal")];
    }

    private static string? Blank(string value) => string.IsNullOrWhiteSpace(value) ? null : value;

    private static string StatusCode(string label) => label switch
    {
        "en attente de validation" => "pending",
        "acceptée" => "accepted",
        "acceptée avec ajustements" => "accepted-with-adjustments",
        "refusée" => "rejected",
        "publiée directement" => "published-directly",
        _ => throw new ArgumentOutOfRangeException(nameof(label), label, "Statut inconnu."),
    };

    // Black-box view of the HTTP contract (deliberately not the Api types).
    private sealed record MyProposalsResponse(IReadOnlyList<MyTransitionResponse> Proposals);

    private sealed record PoseReference(Guid Id, string Name);

    private sealed record MyTransitionResponse(
        string? Kind, Guid Id, string? Status, PoseReference? FromPose, PoseReference? ToPose, string? Name, string? BaseDifficulty,
        string? FlyerDifficulty, string? Description, DateTimeOffset? SubmittedAt, DateTimeOffset? DecidedAt, AdjustmentsResponse? Adjustments,
        string? Message, string? Reason);

    private sealed record AdjustmentsResponse(Change? Name, Change? BaseDifficulty, Change? FlyerDifficulty, Change? Description);

    private sealed record Change(string? Proposed, string? Retained);

    private sealed record Presented(
        string? From, string? To, string? Name, string? BaseDifficulty, string? FlyerDifficulty, string? Description, string? Status, string? SubmittedOn);
}
