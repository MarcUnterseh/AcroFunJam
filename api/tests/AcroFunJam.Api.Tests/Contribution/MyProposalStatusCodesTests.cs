using System.Text.Json;
using AcroFunJam.Api.Endpoints.Contribution;
using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Api.Tests.Contribution;

/// <summary>The status of one of their proposals, for its contributor, as the HTTP contract writes it (story 5, ADR 0023).</summary>
public sealed class MyProposalStatusCodesTests
{
    [Theory]
    [InlineData(MyProposalStatus.Pending, "pending")]
    [InlineData(MyProposalStatus.Accepted, "accepted")]
    [InlineData(MyProposalStatus.AcceptedWithAdjustments, "accepted-with-adjustments")]
    [InlineData(MyProposalStatus.Rejected, "rejected")]
    [InlineData(MyProposalStatus.PublishedDirectly, "published-directly")]
    public void MyProposalStatusCodes_From_Should_MapEachStatusToItsCode_When_Called(MyProposalStatus status, string code)
    {
        var written = JsonSerializer.Serialize(MyProposalStatusCodes.From(status));

        written.ShouldBe($"\"{code}\"");
    }
}
