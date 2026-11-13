using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>A transition proposal as its contributor sees it in « Mes propositions » (story 7, R21, ADR 0028).</summary>
public sealed class MyTransitionProposalTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 14, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = Now.AddDays(1);
    private static readonly ContributorId Alice = new(Guid.NewGuid());
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);
    private static readonly PoseName Star = PoseName.Create("Star").Value!;
    private static readonly TransitionPoses StarToStar = TransitionPoses.Create(Guid.NewGuid(), Guid.NewGuid()).Value!;

    private static readonly ProposedTransition NinjaStar =
        ProposedTransition.Create("Ninja Star", "advanced", "advanced", "Vidéo : https://example.org/ninja-star").Value!;

    private static TransitionProposal APending() => TransitionProposal.Rehydrate(new TransitionProposalId(Guid.NewGuid()), Alice, StarToStar, NinjaStar, Now);

    [Fact]
    public void Of_Should_PresentTheProposedTransitionWithTheCurrentPoseNames_When_ItIsPending()
    {
        var proposal = APending();

        var mine = MyTransitionProposal.Of(proposal, Star, Star);

        mine.ShouldSatisfyAllConditions(
            m => m.Id.ShouldBe(proposal.Id),
            m => m.Poses.ShouldBe(StarToStar),
            m => m.FromPoseName.ShouldBe(Star),
            m => m.ToPoseName.ShouldBe(Star),
            m => m.Name.ShouldBe(NinjaStar.Name),
            m => m.Difficulty.ShouldBe(NinjaStar.Difficulty),
            m => m.Description.ShouldBe(NinjaStar.Description),
            m => m.Status.ShouldBe(MyProposalStatus.Pending),
            m => m.SubmittedAt.ShouldBe(Now),
            m => m.DecidedAt.ShouldBeNull(),
            m => m.Adjustments.ShouldBeEmpty(),
            m => m.ListedName.ShouldBe(Star));
    }

    [Fact]
    public void Of_Should_PresentTheRetainedTransitionAndTheAdjustments_When_AcceptedWithAdjustments()
    {
        var proposal = APending();
        var adjustments = TransitionAdjustments.Create(null, null, null, "Rotation complète, retour en Star.").Value!;
        proposal.Accept(Bruno, adjustments, AdjustmentNote.Create("Le lien est mort.").Value, TransitionSlotAvailability.Available, Later);

        var mine = MyTransitionProposal.Of(proposal, Star, Star);

        IReadOnlyList<TransitionFieldAdjustment> expected =
            [new TransitionDescriptionAdjustment(NinjaStar.Description, TransitionDescription.CreateOptional("Rotation complète, retour en Star.").Value)];
        mine.ShouldSatisfyAllConditions(
            m => m.Status.ShouldBe(MyProposalStatus.AcceptedWithAdjustments),
            m => m.Description!.Value.ShouldBe("Rotation complète, retour en Star."),
            m => m.DecidedAt.ShouldBe(Later),
            m => m.Adjustments.ShouldBe(expected),
            m => m.Note!.Value.ShouldBe("Le lien est mort."));
    }

    [Fact]
    public void Of_Should_PresentTheReason_When_Rejected()
    {
        var proposal = APending();
        var reason = RejectionReason.Create("Cette transition arrive en Bird, pas en Star : propose-la vers Bird.").Value!;
        proposal.Reject(Bruno, reason, Later);

        var mine = MyTransitionProposal.Of(proposal, Star, Star);

        mine.ShouldSatisfyAllConditions(m => m.Status.ShouldBe(MyProposalStatus.Rejected), m => m.Reason.ShouldBe(reason), m => m.DecidedAt.ShouldBe(Later));
    }

    [Fact]
    public void Of_Should_HaveNoDecisionDate_When_PublishedDirectly()
    {
        var proposal = TransitionProposal.Rehydrate(
            new TransitionProposalId(Guid.NewGuid()), Alice, StarToStar, NinjaStar, Now, TransitionAcceptance.DirectPublication(NinjaStar, Alice, Now));

        var mine = MyTransitionProposal.Of(proposal, Star, Star);

        mine.ShouldSatisfyAllConditions(m => m.Status.ShouldBe(MyProposalStatus.PublishedDirectly), m => m.DecidedAt.ShouldBeNull());
    }

    /// <summary>« Mes propositions » mixes every kind, the most recently submitted first (ADR 0027).</summary>
    [Fact]
    public void MyProposalsOrder_Should_PutTheMostRecentFirst_When_ATransitionAndAPoseProposalAreMixed()
    {
        IMyProposal transition = MyTransitionProposal.Of(APending(), Star, Star);
        IMyProposal older = MyPoseProposal.Of(PoseProposal.Rehydrate(new PoseProposalId(Guid.NewGuid()), Alice, AProposedPose.Named("Bird"), Now.AddDays(-1)));

        MyProposalsOrder.Instance.Compare(transition, older).ShouldBeLessThan(0);
    }
}
