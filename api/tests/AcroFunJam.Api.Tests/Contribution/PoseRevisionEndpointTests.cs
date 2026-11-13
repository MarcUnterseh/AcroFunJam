using System.Net;
using System.Net.Http.Json;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>POST /contribution/pose-revision-proposals (story 6, ADR 0024), on the real Api and a real PostgreSQL.</summary>
[Trait("Category", "Integration")]
public sealed class PoseRevisionEndpointTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private static readonly Uri PoseRevisionProposals = new("/contribution/pose-revision-proposals", UriKind.Relative);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>The version read when the revision starts is required: without it, no control of a pose changed meanwhile.</summary>
    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    public async Task ProposePoseRevision_Should_Return400PoseVersionRequired_When_TheVersionIsAbsentOrBelowOne(int? version)
    {
        var (alice, _) = await api.SignedIn(Role.User);
        using var _ = alice;

        var response = await alice.PostAsJsonAsync(
            PoseRevisionProposals, new { poseId = Guid.NewGuid(), poseVersion = version, flyerDifficulty = "discovery" }, Ct);

        await response.ShouldBeAProblem(HttpStatusCode.BadRequest, "contribution.pose-version-required");
    }
}
