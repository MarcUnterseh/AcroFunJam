using AcroFunJam.Application.Contribution.CountPendingPoseProposals;

namespace AcroFunJam.Application.Tests.Contribution;

public sealed class CountPendingPoseProposalsHandlerTests
{
    [Fact]
    public async Task Handle_Should_ReturnTheNumberOfPendingProposals_When_Asked()
    {
        var reader = new FakePendingPoseProposalsReader(
            APendingProposal.Named("Throne").Build(), APendingProposal.Named("Bird").Build());

        var result = await new CountPendingPoseProposalsHandler(reader)
            .Handle(new CountPendingPoseProposals(), TestContext.Current.CancellationToken);

        result.Value.ShouldBe(2);
    }
}
