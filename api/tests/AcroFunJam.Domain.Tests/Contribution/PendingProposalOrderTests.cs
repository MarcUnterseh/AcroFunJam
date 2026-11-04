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
}
