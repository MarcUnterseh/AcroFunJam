using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Tests.Contribution;

/// <summary>Test data builder of a pending <see cref="PoseProposal"/>, as loaded from storage.</summary>
internal sealed class APendingProposal
{
    private readonly string _name;
    private ContributorId _contributor = new(Guid.NewGuid());
    private DateTimeOffset _submittedAt = new(2026, 11, 1, 9, 0, 0, TimeSpan.Zero);

    private APendingProposal(string name) => _name = name;

    public static APendingProposal Named(string name) => new(name);

    public APendingProposal By(ContributorId contributor)
    {
        _contributor = contributor;
        return this;
    }

    public APendingProposal SubmittedAt(DateTimeOffset submittedAt)
    {
        _submittedAt = submittedAt;
        return this;
    }

    public PoseProposal Build() =>
        PoseProposal.Rehydrate(
            new PoseProposalId(Guid.NewGuid()), _contributor,
            ProposedPose.Create(_name, "beginner", "discovery", true, true).Value!, _submittedAt);
}
