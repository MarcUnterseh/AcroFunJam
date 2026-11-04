using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>POST /contribution/pose-proposals/{id}/acceptance and /rejection (ADR 0022), on the real Api and a real PostgreSQL.</summary>
[Trait("Category", "Integration")]
public sealed class PoseProposalDecisionEndpointTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static Uri Acceptance(object proposal) => new($"/contribution/pose-proposals/{proposal}/acceptance", UriKind.Relative);

    private static Uri Rejection(object proposal) => new($"/contribution/pose-proposals/{proposal}/rejection", UriKind.Relative);

    /// <summary>A pending proposal of a user, and its identifier read from the validation queue of this validator.</summary>
    private async Task<(Guid Id, string Name)> APendingProposal(HttpClient validator)
    {
        var (alice, _) = await api.SignedIn(Role.User);
        using var _ = alice;
        var name = await alice.ProposeAPose();
        var queue = await validator.GetFromJsonAsync<JsonElement>(new Uri("/contribution/validation-queue", UriKind.Relative), Ct);
        var id = queue.GetProperty("proposals").EnumerateArray().Single(p => p.GetProperty("name").GetString() == name).GetProperty("id").GetGuid();
        return (id, name);
    }

    [Fact]
    public async Task Accept_Should_Answer200WithTheAcceptedProposal_When_AValidatorAccepts()
    {
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var _ = bruno;
        var (id, name) = await APendingProposal(bruno);

        var response = await bruno.PostAsync(Acceptance(id), content: null, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync(Ct));
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        body.GetProperty("id").GetGuid().ShouldBe(id);
        body.GetProperty("status").GetString().ShouldBe("accepted");
        body.GetProperty("adjusted").GetBoolean().ShouldBeFalse();
        body.GetProperty("name").GetString().ShouldBe(name);
        body.GetProperty("baseDifficulty").GetString().ShouldBe("beginner");
        body.GetProperty("flyerDifficulty").GetString().ShouldBe("discovery");
        body.GetProperty("canStartFlow").GetBoolean().ShouldBeTrue();
        body.GetProperty("canEndFlow").GetBoolean().ShouldBeFalse();
    }

    [Fact]
    public async Task Accept_Should_Answer403CapabilityRequired_When_TheRoleWasRevokedSinceSigningIn()
    {
        var (bruno, brunoEmail) = await api.SignedIn(Role.Validator);
        using var _ = bruno;
        var (id, _) = await APendingProposal(bruno);
        await api.Revoke(brunoEmail, Role.Validator);

        var response = await bruno.PostAsync(Acceptance(id), content: null, Ct);

        await response.ShouldBeAProblem(HttpStatusCode.Forbidden, "identity.capability-required");
    }

    [Fact]
    public async Task Accept_Should_Answer404_When_TheIdIsNotAGuid()
    {
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var _ = bruno;

        var response = await bruno.PostAsync(Acceptance("not-a-guid"), content: null, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Reject_Should_Answer400RejectionReasonRequired_When_TheBodyHasNoReason()
    {
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var _ = bruno;
        var (id, _) = await APendingProposal(bruno);

        var response = await bruno.PostAsJsonAsync(Rejection(id), new { }, Ct);

        await response.ShouldBeAProblem(HttpStatusCode.BadRequest, "contribution.rejection-reason-required");
    }

    [Fact]
    public async Task Reject_Should_Answer200Rejected_When_AValidatorRejectsWithAReason()
    {
        var (bruno, _) = await api.SignedIn(Role.Validator);
        using var _ = bruno;
        var (id, _) = await APendingProposal(bruno);

        var response = await bruno.PostAsJsonAsync(Rejection(id), new { reason = "Doublon de Bird, déjà au catalogue." }, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync(Ct));
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Ct);
        body.GetProperty("id").GetGuid().ShouldBe(id);
        body.GetProperty("status").GetString().ShouldBe("rejected");
    }
}
