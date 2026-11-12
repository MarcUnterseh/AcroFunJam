using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>Order of « Mes propositions » (Q20): the most recently submitted first, then the catalog order of the presented names.</summary>
public sealed class MyProposalsOrderTests
{
    private static readonly DateTimeOffset Monday = new(2026, 11, 2, 9, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Tuesday = Monday.AddDays(1);
    private static readonly ContributorId Alice = new(Guid.NewGuid());

    private static MyPoseProposal AProposal(string name, DateTimeOffset submittedAt, Guid? id = null) =>
        MyPoseProposal.Of(PoseProposal.Rehydrate(new PoseProposalId(id ?? Guid.NewGuid()), Alice, AProposedPose.Named(name), submittedAt));

    [Fact]
    public void Compare_Should_PutTheMostRecentlySubmittedFirst_When_SubmittedOnDifferentDates()
    {
        var older = AProposal("Bird", Monday);
        var newer = AProposal("Throne", Tuesday);

        MyProposalsOrder.Instance.Compare(newer, older).ShouldBeLessThan(0);
        MyProposalsOrder.Instance.Compare(older, newer).ShouldBeGreaterThan(0);
    }

    [Fact]
    public void Compare_Should_FollowTheCatalogOrderOfThePresentedName_When_SubmittedAtTheSameInstant()
    {
        // Catalog order ignores case: "bird" before "Folded Leaf".
        var bird = AProposal("bird", Monday);
        var foldedLeaf = AProposal("Folded Leaf", Monday);

        MyProposalsOrder.Instance.Compare(bird, foldedLeaf).ShouldBeLessThan(0);
        MyProposalsOrder.Instance.Compare(foldedLeaf, bird).ShouldBeGreaterThan(0);
    }

    [Fact]
    public void Compare_Should_UseTheRetainedName_When_AnAcceptedProposalWasRenamed()
    {
        // Proposed as "Zebra", retained as "Bird": presented, hence ordered, as "Bird", before "Folded Leaf".
        var zebra = PoseProposal.Rehydrate(new PoseProposalId(Guid.NewGuid()), Alice, AProposedPose.Named("Zebra"), Monday);
        var validator = new Validator(new ValidatorId(Guid.NewGuid()), CanDecide: true);
        zebra.Accept(
            validator, zebra.Pose.Retain(PoseAdjustments.Create("Bird", null, null, null, null).Value!), note: null,
            NameAvailability.Available, Tuesday).IsSuccess.ShouldBeTrue();
        var foldedLeaf = AProposal("Folded Leaf", Monday);

        MyProposalsOrder.Instance.Compare(MyPoseProposal.Of(zebra), foldedLeaf).ShouldBeLessThan(0);
    }

    /// <summary>A deterministic order, even for two proposals of the same name submitted at the same instant (one rejected).</summary>
    [Fact]
    public void Compare_Should_PutTheMostRecentIdFirst_When_SubmissionAndNameAreEqual()
    {
        var first = AProposal("Throne", Monday, Guid.Parse("00000000-0000-0000-0000-000000000001"));
        var second = AProposal("Throne", Monday, Guid.Parse("00000000-0000-0000-0000-000000000002"));

        MyProposalsOrder.Instance.Compare(second, first).ShouldBeLessThan(0);
        MyProposalsOrder.Instance.Compare(first, second).ShouldBeGreaterThan(0);
    }
}
