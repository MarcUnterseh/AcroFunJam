using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>
/// GET /contribution/pose-revision-proposals/pending?poseId={id} (story 6, decision D): whether a published pose already has a
/// pending revision, « la tienne » or not, on the real Api and a real PostgreSQL.
/// </summary>
[Trait("Category", "Integration")]
public sealed class PendingRevisionOfPoseEndpointTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static Uri PendingRevisionOf(Guid poseId) =>
        new($"/contribution/pose-revision-proposals/pending?poseId={poseId}", UriKind.Relative);

    /// <summary>A pose published directly by a validator; returns its identifier and version.</summary>
    private async Task<(Guid Id, int Version)> APublishedPose()
    {
        var (validator, _) = await api.SignedIn(Role.Validator);
        using var _ = validator;
        var name = await validator.ProposeAPose();
        using var visitor = api.CreateClient();
        var poses = await visitor.GetFromJsonAsync<JsonElement>(new Uri("/catalog/poses", UriKind.Relative), Ct);
        var id = poses.GetProperty("poses").EnumerateArray().Single(p => p.GetProperty("name").GetString() == name).GetProperty("id").GetGuid();
        var pose = await visitor.GetFromJsonAsync<JsonElement>(new Uri($"/catalog/poses/{id}", UriKind.Relative), Ct);
        return (id, pose.GetProperty("version").GetInt32());
    }

    private static async Task<JsonElement> PendingRevisionAsSeenBy(HttpClient browser, Guid poseId)
    {
        var response = await browser.GetAsync(PendingRevisionOf(poseId), Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync(Ct));
        return (await response.Content.ReadFromJsonAsync<JsonElement>(Ct)).GetProperty("pendingRevision");
    }

    [Fact]
    public async Task GetPendingRevisionOfPose_Should_Return401_When_TheRequesterIsAVisitor()
    {
        using var visitor = api.CreateClient();

        var response = await visitor.GetAsync(PendingRevisionOf(Guid.NewGuid()), Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetPendingRevisionOfPose_Should_ReturnNoPendingRevision_When_ThePoseHasNone()
    {
        var (pose, _) = await APublishedPose();
        var (alice, _) = await api.SignedIn(Role.User);
        using var _ = alice;

        (await PendingRevisionAsSeenBy(alice, pose)).ValueKind.ShouldBe(JsonValueKind.Null);
    }

    [Fact]
    public async Task GetPendingRevisionOfPose_Should_TellWhetherThePendingRevisionIsTheRequesters_When_ThePoseHasOne()
    {
        var (pose, version) = await APublishedPose();
        var (alice, _) = await api.SignedIn(Role.User);
        var (chloe, _) = await api.SignedIn(Role.User);
        using var _ = alice;
        using var __ = chloe;
        (await alice.PostAsJsonAsync(
            new Uri("/contribution/pose-revision-proposals", UriKind.Relative),
            new { poseId = pose, poseVersion = version, flyerDifficulty = "advanced" }, Ct)).EnsureSuccessStatusCode();

        (await PendingRevisionAsSeenBy(alice, pose)).GetProperty("isYours").GetBoolean().ShouldBeTrue();
        (await PendingRevisionAsSeenBy(chloe, pose)).GetProperty("isYours").GetBoolean().ShouldBeFalse();
    }
}
