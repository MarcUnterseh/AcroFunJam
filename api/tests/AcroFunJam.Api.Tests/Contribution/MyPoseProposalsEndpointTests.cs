using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>GET /contribution/my-pose-proposals (story 5, ADR 0023), on the real Api and a real PostgreSQL.</summary>
[Trait("Category", "Integration")]
public sealed class MyPoseProposalsEndpointTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private static readonly Uri MyPoseProposals = new("/contribution/my-pose-proposals", UriKind.Relative);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task GetMyPoseProposals_Should_Return401_When_TheCallerIsAVisitor()
    {
        using var visitor = api.CreateBrowserClient();

        var response = await visitor.GetAsync(MyPoseProposals, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");
    }

    /// <summary>Story 3: a deleted account is handled as an expired session.</summary>
    [Fact]
    public async Task GetMyPoseProposals_Should_Return401AccountDeleted_When_TheAccountWasDeletedSinceSignIn()
    {
        var (alice, email) = await api.SignedIn(Role.User);
        using var _ = alice;
        using (var scope = api.Services.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<AcroFunJamDbContext>().Users.Where(u => u.Email == email).ExecuteDeleteAsync(Ct);
        }

        var response = await alice.GetAsync(MyPoseProposals, Ct);

        await response.ShouldBeAProblem(HttpStatusCode.Unauthorized, "identity.account-deleted");
    }

    /// <summary>Whoever can propose follows their proposals.</summary>
    [Theory]
    [InlineData("user")]
    [InlineData("validator")]
    [InlineData("administrator")]
    public async Task GetMyPoseProposals_Should_Return200ForEveryRole_When_SignedIn(string role)
    {
        var (someone, _) = await api.SignedIn(Role.FromCode(role).Value!);
        using var _ = someone;

        var response = await someone.GetAsync(MyPoseProposals, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync(Ct));
    }

    [Fact]
    public async Task GetMyPoseProposals_Should_ReturnAnEmptyList_When_NothingWasProposed()
    {
        var (alice, _) = await api.SignedIn(Role.User);
        using var _ = alice;

        var proposals = await MyProposals(alice);

        proposals.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetMyPoseProposals_Should_ReturnNullDecisionDateAdjustmentsMessageAndReason_When_Pending()
    {
        var (alice, _) = await api.SignedIn(Role.User);
        using var _ = alice;
        var name = await alice.ProposeAPose();

        var proposal = (await MyProposals(alice)).ShouldHaveSingleItem();

        proposal.ShouldSatisfyAllConditions(
            () => proposal.GetProperty("id").GetGuid().ShouldNotBe(Guid.Empty),
            () => proposal.GetProperty("status").GetString().ShouldBe("pending"),
            () => proposal.GetProperty("name").GetString().ShouldBe(name),
            () => proposal.GetProperty("baseDifficulty").GetString().ShouldBe("beginner"),
            () => proposal.GetProperty("flyerDifficulty").GetString().ShouldBe("discovery"),
            () => proposal.GetProperty("canStartFlow").GetBoolean().ShouldBeTrue(),
            () => proposal.GetProperty("canEndFlow").GetBoolean().ShouldBeFalse(),
            () => proposal.GetProperty("submittedAt").GetDateTimeOffset().ShouldBe(api.Clock.GetUtcNow(), TimeSpan.FromSeconds(1)),
            () => proposal.GetProperty("decidedAt").ValueKind.ShouldBe(JsonValueKind.Null),
            () => proposal.GetProperty("adjustments").ValueKind.ShouldBe(JsonValueKind.Null),
            () => proposal.GetProperty("message").ValueKind.ShouldBe(JsonValueKind.Null),
            () => proposal.GetProperty("reason").ValueKind.ShouldBe(JsonValueKind.Null));
    }

    [Fact]
    public async Task GetMyPoseProposals_Should_ReturnTheRetainedPoseAndOnlyTheAdjustedFields_When_AcceptedWithAdjustments()
    {
        var (alice, _) = await api.SignedIn(Role.User);
        using var _ = alice;
        var name = await alice.ProposeAPose(); // beginner / discovery, can start, cannot end
        var retainedName = name.ToUpperInvariant();
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var __ = bruno;
        var id = (await MyProposals(alice)).Single().GetProperty("id").GetGuid();
        (await bruno.PostAsJsonAsync(
                new Uri($"/contribution/pose-proposals/{id}/acceptance", UriKind.Relative),
                new { name = retainedName, flyerDifficulty = "intermediate", message = "Casse et difficulté ajustées." }, Ct))
            .EnsureSuccessStatusCode();

        var proposal = (await MyProposals(alice)).ShouldHaveSingleItem();

        var adjustments = proposal.GetProperty("adjustments");
        proposal.ShouldSatisfyAllConditions(
            () => proposal.GetProperty("status").GetString().ShouldBe("accepted-with-adjustments"),
            () => proposal.GetProperty("name").GetString().ShouldBe(retainedName),
            () => proposal.GetProperty("flyerDifficulty").GetString().ShouldBe("intermediate"),
            () => proposal.GetProperty("decidedAt").GetDateTimeOffset().ShouldBe(api.Clock.GetUtcNow(), TimeSpan.FromSeconds(1)),
            () => proposal.GetProperty("message").GetString().ShouldBe("Casse et difficulté ajustées."),
            () => adjustments.GetProperty("name").GetProperty("proposed").GetString().ShouldBe(name),
            () => adjustments.GetProperty("name").GetProperty("retained").GetString().ShouldBe(retainedName),
            () => adjustments.GetProperty("flyerDifficulty").GetProperty("proposed").GetString().ShouldBe("discovery"),
            () => adjustments.GetProperty("flyerDifficulty").GetProperty("retained").GetString().ShouldBe("intermediate"),
            () => adjustments.GetProperty("baseDifficulty").ValueKind.ShouldBe(JsonValueKind.Null),
            () => adjustments.GetProperty("canStartFlow").ValueKind.ShouldBe(JsonValueKind.Null),
            () => adjustments.GetProperty("canEndFlow").ValueKind.ShouldBe(JsonValueKind.Null));
    }

    [Fact]
    public async Task GetMyPoseProposals_Should_ReturnEachAdjustedFieldInItsMember_When_EveryFieldWasAdjusted()
    {
        var (alice, _) = await api.SignedIn(Role.User);
        using var _ = alice;
        var name = await alice.ProposeAPose(); // beginner / discovery, can start, cannot end
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var __ = bruno;
        var id = (await MyProposals(alice)).Single().GetProperty("id").GetGuid();
        (await bruno.PostAsJsonAsync(
                new Uri($"/contribution/pose-proposals/{id}/acceptance", UriKind.Relative),
                new
                {
                    name = name.ToUpperInvariant(), baseDifficulty = "advanced", flyerDifficulty = "intermediate", canStartFlow = false,
                    canEndFlow = true,
                }, Ct))
            .EnsureSuccessStatusCode();

        var adjustments = (await MyProposals(alice)).ShouldHaveSingleItem().GetProperty("adjustments");

        adjustments.ShouldSatisfyAllConditions(
            () => adjustments.GetProperty("name").GetProperty("proposed").GetString().ShouldBe(name),
            () => adjustments.GetProperty("name").GetProperty("retained").GetString().ShouldBe(name.ToUpperInvariant()),
            () => adjustments.GetProperty("baseDifficulty").GetProperty("proposed").GetString().ShouldBe("beginner"),
            () => adjustments.GetProperty("baseDifficulty").GetProperty("retained").GetString().ShouldBe("advanced"),
            () => adjustments.GetProperty("flyerDifficulty").GetProperty("proposed").GetString().ShouldBe("discovery"),
            () => adjustments.GetProperty("flyerDifficulty").GetProperty("retained").GetString().ShouldBe("intermediate"),
            () => adjustments.GetProperty("canStartFlow").GetProperty("proposed").GetBoolean().ShouldBeTrue(),
            () => adjustments.GetProperty("canStartFlow").GetProperty("retained").GetBoolean().ShouldBeFalse(),
            () => adjustments.GetProperty("canEndFlow").GetProperty("proposed").GetBoolean().ShouldBeFalse(),
            () => adjustments.GetProperty("canEndFlow").GetProperty("retained").GetBoolean().ShouldBeTrue());
    }

    /// <summary>Alice proposes a pose, Bruno (validator) rejects it; returns Alice's browser, Bruno's address and the proposal.</summary>
    private async Task<(HttpClient Alice, string BrunoEmail, Guid Proposal)> ARejectedProposal(string reason)
    {
        var (alice, _) = await api.SignedIn(Role.User);
        await alice.ProposeAPose();
        var (bruno, brunoEmail) = await api.SignedIn(Role.Validator);
        using var _ = bruno;
        var id = (await MyProposals(alice)).Single().GetProperty("id").GetGuid();
        (await bruno.PostAsJsonAsync(new Uri($"/contribution/pose-proposals/{id}/rejection", UriKind.Relative), new { reason }, Ct))
            .EnsureSuccessStatusCode();
        return (alice, brunoEmail, id);
    }

    [Fact]
    public async Task GetMyPoseProposals_Should_ReturnTheReasonAndTheDecisionDate_When_Rejected()
    {
        var (alice, _, _) = await ARejectedProposal("Doublon de Bird, déjà au catalogue.");
        using var _ = alice;

        var proposal = (await MyProposals(alice)).ShouldHaveSingleItem();

        proposal.ShouldSatisfyAllConditions(
            () => proposal.GetProperty("status").GetString().ShouldBe("rejected"),
            () => proposal.GetProperty("reason").GetString().ShouldBe("Doublon de Bird, déjà au catalogue."),
            () => proposal.GetProperty("decidedAt").GetDateTimeOffset().ShouldBe(api.Clock.GetUtcNow(), TimeSpan.FromSeconds(1)),
            () => proposal.GetProperty("adjustments").ValueKind.ShouldBe(JsonValueKind.Null),
            () => proposal.GetProperty("message").ValueKind.ShouldBe(JsonValueKind.Null));
    }

    [Fact]
    public async Task GetMyPoseProposals_Should_ReturnPublishedDirectlyWithoutDecisionDate_When_AValidatorProposed()
    {
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var _ = bruno;
        var name = await bruno.ProposeAPose();

        var proposal = (await MyProposals(bruno)).ShouldHaveSingleItem();

        proposal.ShouldSatisfyAllConditions(
            () => proposal.GetProperty("status").GetString().ShouldBe("published-directly"),
            () => proposal.GetProperty("name").GetString().ShouldBe(name),
            () => proposal.GetProperty("decidedAt").ValueKind.ShouldBe(JsonValueKind.Null),
            () => proposal.GetProperty("adjustments").ValueKind.ShouldBe(JsonValueKind.Null));
    }

    /// <summary>Q12: neither the address nor the identifier of the validator, nor any member beyond the contract.</summary>
    [Fact]
    public async Task GetMyPoseProposals_Should_NeverMentionTheValidator_When_Decided()
    {
        var (alice, brunoEmail, _) = await ARejectedProposal("Doublon de Bird, déjà au catalogue.");
        using var _ = alice;
        Guid brunoId;
        using (var scope = api.Services.CreateScope())
        {
            brunoId = (await scope.ServiceProvider.GetRequiredService<AcroFunJamDbContext>().Users.SingleAsync(u => u.Email == brunoEmail, Ct)).Id;
        }

        var proposal = (await MyProposals(alice)).ShouldHaveSingleItem();

        var json = proposal.GetRawText();
        proposal.ShouldSatisfyAllConditions(
            () => proposal.EnumerateObject().Select(member => member.Name).ShouldBe(
                [
                    "id", "status", "name", "baseDifficulty", "flyerDifficulty", "canStartFlow", "canEndFlow", "submittedAt", "decidedAt",
                    "adjustments", "message", "reason",
                ],
                ignoreOrder: true),
            () => json.ShouldNotContain(brunoEmail, Case.Insensitive),
            () => json.ShouldNotContain(brunoId.ToString(), Case.Insensitive));
    }

    /// <summary>ADR 0023: the contract of the proposal itself is unchanged, a direct publication is an acceptance.</summary>
    [Fact]
    public async Task ProposePose_Should_StillAnswerAccepted_When_PublishedDirectly()
    {
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var _ = bruno;
        var proposal = new { name = $"Star {Guid.NewGuid():N}"[..20], baseDifficulty = "beginner", flyerDifficulty = "discovery", canStartFlow = true, canEndFlow = true };

        var response = await bruno.PostAsJsonAsync(new Uri("/contribution/pose-proposals", UriKind.Relative), proposal, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Created, await response.Content.ReadAsStringAsync(Ct));
        (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("status").GetString().ShouldBe("accepted");
        (await MyProposals(bruno)).ShouldHaveSingleItem().GetProperty("status").GetString().ShouldBe("published-directly");
    }

    private static async Task<IReadOnlyList<JsonElement>> MyProposals(HttpClient contributor)
    {
        var response = await contributor.GetAsync(MyPoseProposals, Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync(Ct));
        return [.. (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("proposals").EnumerateArray()];
    }
}
