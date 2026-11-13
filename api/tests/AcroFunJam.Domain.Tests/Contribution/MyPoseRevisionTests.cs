using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>A revision proposal as its contributor sees it in « Mes propositions » (story 6, R19, ADR 0027).</summary>
public sealed class MyPoseRevisionTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = Now.AddDays(1);
    private static readonly Contributor Alice = new(new ContributorId(Guid.NewGuid()), IsValidator: false);
    private static readonly Validator Bruno = new(new ValidatorId(Guid.NewGuid()), CanDecide: true);

    private static readonly PublishedPose Throne = new(
        new PublishedPoseId(Guid.NewGuid()),
        new PriorPose(
            PoseName.Create("Throne").Value!,
            Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Advanced).Value!,
            FlowBoundaries.Create(canStartFlow: true, canEndFlow: true).Value!),
        new PublishedPoseVersion(1));

    private static PoseRevisionProposal FlyerTo(string level, Contributor? by = null) =>
        PoseRevisionProposal.Submit(
            new PoseRevisionProposalId(Guid.NewGuid()), by ?? Alice, Throne, Throne.Version,
            PoseChanges.Create(name: null, baseDifficulty: null, level, canStartFlow: null, canEndFlow: null).Value!, message: null,
            revisionAlreadyPending: false, NameAvailability.Available, Now).Value!;

    private static PoseAdjustments Adjusting(string? baseDifficulty = null, string? flyerDifficulty = null) =>
        PoseAdjustments.Create(name: null, baseDifficulty, flyerDifficulty, canStartFlow: null, canEndFlow: null).Value!;

    [Fact]
    public void Of_Should_PresentTheChangesFromTheValuesBeforeToTheProposedValues_When_ThePoseRevisionIsPending()
    {
        var revision = FlyerTo("intermediate");

        var mine = MyPoseRevision.Of(revision);

        IReadOnlyList<PoseFieldChange> changes = [new FlyerDifficultyChange(DifficultyLevel.Advanced, DifficultyLevel.Intermediate)];
        mine.ShouldSatisfyAllConditions(
            m => m.Id.ShouldBe(revision.Id),
            m => m.PoseName.ShouldBe(Throne.Values.Name),
            m => m.Status.ShouldBe(MyProposalStatus.Pending),
            m => m.SubmittedAt.ShouldBe(Now),
            m => m.DecidedAt.ShouldBeNull(),
            m => m.Changes.ShouldBe(changes),
            m => m.Adjustments.ShouldBeEmpty());
    }

    [Fact]
    public void Of_Should_PresentTheChangesToTheRetainedValuesAndTheAdjustments_When_AcceptedWithAdjustments()
    {
        var revision = FlyerTo("intermediate");
        revision.Accept(Bruno, Adjusting(flyerDifficulty: "discovery"), note: null, NameAvailability.Available, Later);

        var mine = MyPoseRevision.Of(revision);

        IReadOnlyList<PoseFieldChange> changes = [new FlyerDifficultyChange(DifficultyLevel.Advanced, DifficultyLevel.Discovery)];
        IReadOnlyList<PoseFieldAdjustment> adjustments = [new FlyerDifficultyAdjustment(DifficultyLevel.Intermediate, DifficultyLevel.Discovery)];
        mine.ShouldSatisfyAllConditions(
            m => m.Status.ShouldBe(MyProposalStatus.AcceptedWithAdjustments),
            m => m.DecidedAt.ShouldBe(Later),
            m => m.Changes.ShouldBe(changes),
            m => m.Adjustments.ShouldBe(adjustments));
    }

    /// <summary>Decision (1) of 2026-11-12: a field the revision did not change, adjusted by the validator, is in both blocks.</summary>
    [Fact]
    public void Of_Should_PresentAFieldTheRevisionDidNotChangeInBothBlocks_When_TheValidatorAdjustsIt()
    {
        var revision = FlyerTo("intermediate");
        revision.Accept(Bruno, Adjusting(baseDifficulty: "discovery"), note: null, NameAvailability.Available, Later);

        var mine = MyPoseRevision.Of(revision);

        mine.Changes.ShouldContain(new BaseDifficultyChange(DifficultyLevel.Beginner, DifficultyLevel.Discovery));
        mine.Adjustments.ShouldBe([new BaseDifficultyAdjustment(DifficultyLevel.Beginner, DifficultyLevel.Discovery)]);
    }

    [Fact]
    public void Of_Should_PresentTheReasonAndTheProposedChanges_When_Rejected()
    {
        var revision = FlyerTo("intermediate");
        var reason = RejectionReason.Create("Throne reste avancé côté flyer.").Value!;
        revision.Reject(Bruno, reason, Later);

        var mine = MyPoseRevision.Of(revision);

        mine.ShouldSatisfyAllConditions(
            m => m.Status.ShouldBe(MyProposalStatus.Rejected),
            m => m.Reason.ShouldBe(reason),
            m => m.DecidedAt.ShouldBe(Later),
            m => m.Changes.ShouldBe([new FlyerDifficultyChange(DifficultyLevel.Advanced, DifficultyLevel.Intermediate)]));
    }

    [Fact]
    public void Of_Should_HaveNoDecisionDate_When_PublishedDirectly()
    {
        var mine = MyPoseRevision.Of(FlyerTo("intermediate", new Contributor(new ContributorId(Guid.NewGuid()), IsValidator: true)));

        mine.ShouldSatisfyAllConditions(m => m.Status.ShouldBe(MyProposalStatus.PublishedDirectly), m => m.DecidedAt.ShouldBeNull());
    }

    /// <summary>« Mes propositions » mixes both kinds, the most recently submitted first (ADR 0027).</summary>
    [Fact]
    public void MyProposalsOrder_Should_PutTheMostRecentFirst_When_ARevisionAndAPoseProposalAreMixed()
    {
        IMyProposal revision = MyPoseRevision.Of(FlyerTo("intermediate"));
        IMyProposal older = MyPoseProposal.Of(PoseProposal.Rehydrate(
            new PoseProposalId(Guid.NewGuid()), Alice.Id, AProposedPose.Named("Star"), Now.AddDays(-1)));

        MyProposalsOrder.Instance.Compare(revision, older).ShouldBeLessThan(0);
        MyProposalsOrder.Instance.Compare(older, revision).ShouldBeGreaterThan(0);
    }
}
