using AcroFunJam.Application.Contribution.GetMyProposals;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>« Mes propositions » with pose proposals and revision proposals together (story 6, ADR 0027).</summary>
public sealed class GetMyProposalsHandlerTests
{
    private static readonly DateTimeOffset Monday = new(2026, 11, 9, 9, 0, 0, TimeSpan.Zero);
    private static readonly ContributorId Alice = new(Guid.NewGuid());
    private static readonly ContributorId Chloe = new(Guid.NewGuid());
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static PoseRevisionProposal ARevisionOfThroneBy(ContributorId contributor, DateTimeOffset submittedAt)
    {
        var throne = new PublishedPose(
            new PublishedPoseId(Guid.NewGuid()),
            new PriorPose(
                PoseName.Create("Throne").Value!,
                Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Intermediate).Value!,
                FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
            new PublishedPoseVersion(1));
        return PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.NewGuid()), new Contributor(contributor, IsValidator: false), throne, throne.Version,
            PoseChanges.Create(name: null, baseDifficulty: null, "discovery", canStartFlow: null, canEndFlow: null).Value!, message: null,
            revisionAlreadyPending: false, NameAvailability.Available, submittedAt).Value!;
    }

    [Fact]
    public async Task Handle_Should_ReturnThePoseProposalsAndRevisionsOfTheRequesterMostRecentFirst_When_Asked()
    {
        var star = APendingProposal.Named("Star").By(Alice).SubmittedAt(Monday).Build();
        var revision = ARevisionOfThroneBy(Alice, Monday.AddDays(1));
        var handler = new GetMyProposalsHandler(
            new FakeMyPoseProposalsReader(star), new FakeMyPoseRevisionsReader(revision, ARevisionOfThroneBy(Chloe, Monday)));

        var result = await handler.Handle(new GetMyProposals(Alice), Ct);

        result.Value.ShouldNotBeNull().Select(p => p.Identifier).ShouldBe([revision.Id.Value, star.Id.Value]);
        result.Value[0].ShouldBeOfType<MyPoseRevision>();
        result.Value[1].ShouldBeOfType<MyPoseProposal>();
    }
}
