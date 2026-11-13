using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>Order of the validation queue: the oldest submission first, then the catalog order of names.</summary>
public sealed class PendingProposalOrderTests
{
    private static readonly DateTimeOffset Monday = new(2026, 11, 2, 9, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Tuesday = Monday.AddDays(1);

    private static PoseProposal AProposal(string name, DateTimeOffset submittedAt) =>
        PoseProposal.Rehydrate(
            new PoseProposalId(Guid.NewGuid()), new ContributorId(Guid.NewGuid()), AProposedPose.Named(name), submittedAt);

    [Fact]
    public void Compare_Should_PutTheOldestFirst_When_SubmissionDatesDiffer()
    {
        var older = AProposal("Throne", Monday);
        var newer = AProposal("Bird", Tuesday);

        PendingProposalOrder.Instance.Compare(older, newer).ShouldBeLessThan(0);
        PendingProposalOrder.Instance.Compare(newer, older).ShouldBeGreaterThan(0);
    }

    [Fact]
    public void Compare_Should_FollowTheCatalogOrderOfNames_When_SubmissionDatesAreEqual()
    {
        // Catalog order ignores case: "bird" before "Folded Leaf".
        var bird = AProposal("bird", Monday);
        var foldedLeaf = AProposal("Folded Leaf", Monday);

        PendingProposalOrder.Instance.Compare(bird, foldedLeaf).ShouldBeLessThan(0);
        PendingProposalOrder.Instance.Compare(foldedLeaf, bird).ShouldBeGreaterThan(0);
    }

    /// <summary>A revision proposal, named in the queue by the pose before the revision (story 6, ADR 0027).</summary>
    private static PoseRevisionProposal ARevisionOf(string name, DateTimeOffset submittedAt)
    {
        var before = ProposedPose.Create(name, "beginner", "intermediate", canStartFlow: true, canEndFlow: true).Value!;
        return PoseRevisionProposal.Rehydrate(
            new PoseRevisionProposalId(Guid.NewGuid()), new ContributorId(Guid.NewGuid()), new PublishedPoseId(Guid.NewGuid()),
            new PublishedPoseVersion(1),
            ProposedRevision.Restore(new PriorPose(before.Name, before.Difficulty, before.Flow), AProposedPose.Named(name)),
            submittedAt);
    }

    [Fact]
    public void Compare_Should_PutTheOldestFirst_When_ARevisionAndAPoseProposalAreMixed()
    {
        IPendingProposal star = AProposal("Star", Monday);
        IPendingProposal throneRevision = ARevisionOf("Throne", Tuesday);

        PendingProposalOrder.Instance.Compare(star, throneRevision).ShouldBeLessThan(0);
        PendingProposalOrder.Instance.Compare(throneRevision, star).ShouldBeGreaterThan(0);
    }

    [Fact]
    public void Compare_Should_FollowTheCatalogOrderOfThePoseBeforeTheRevision_When_SubmittedAtTheSameInstant()
    {
        IPendingProposal bird = ARevisionOf("Bird", Monday);
        IPendingProposal star = AProposal("Star", Monday);

        PendingProposalOrder.Instance.Compare(bird, star).ShouldBeLessThan(0);
    }
}
