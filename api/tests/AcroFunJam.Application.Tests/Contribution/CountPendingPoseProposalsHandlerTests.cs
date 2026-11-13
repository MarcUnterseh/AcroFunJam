using AcroFunJam.Application.Contribution.CountPendingPoseProposals;

namespace AcroFunJam.Application.Tests.Contribution;

public sealed class CountPendingPoseProposalsHandlerTests
{
    [Fact]
    public async Task Handle_Should_ReturnTheNumberOfPendingProposals_When_Asked()
    {
        var reader = new FakePendingPoseProposalsReader(
            APendingProposal.Named("Throne").Build(), APendingProposal.Named("Bird").Build());

        var result = await new CountPendingPoseProposalsHandler(reader, new FakePendingPoseRevisionsReader(), new FakePendingTransitionProposalsReader())
            .Handle(new CountPendingPoseProposals(), TestContext.Current.CancellationToken);

        result.Value.ShouldBe(2);
    }

    /// <summary>Story 6, ADR 0027: the revisions pending validation are counted too.</summary>
    [Fact]
    public async Task Handle_Should_CountThePendingRevisionsToo_When_SomeArePending()
    {
        var revisions = new FakePendingPoseRevisionsReader { Count = 3 };

        var result = await new CountPendingPoseProposalsHandler(new FakePendingPoseProposalsReader(APendingProposal.Named("Throne").Build()), revisions, new FakePendingTransitionProposalsReader())
            .Handle(new CountPendingPoseProposals(), TestContext.Current.CancellationToken);

        result.Value.ShouldBe(4);
    }
}
