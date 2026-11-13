using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A transition proposal as the validation queue presents it (story 7, R13, ADR 0028): with the current names of its poses, read
/// in the catalog, and known in the queue by the current name of its start pose.
/// </summary>
public sealed record PendingTransitionProposal : IPendingProposal
{
    public TransitionProposal Proposal { get; }

    public PoseName FromPoseName { get; }

    public PoseName ToPoseName { get; }

    public DateTimeOffset SubmittedAt => Proposal.SubmittedAt;

    public PoseName QueuedName => FromPoseName;

    private PendingTransitionProposal(TransitionProposal proposal, PoseName fromPoseName, PoseName toPoseName)
    {
        Proposal = proposal;
        FromPoseName = fromPoseName;
        ToPoseName = toPoseName;
    }

    public static PendingTransitionProposal Of(TransitionProposal proposal, PoseName fromPoseName, PoseName toPoseName)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        ArgumentNullException.ThrowIfNull(fromPoseName);
        ArgumentNullException.ThrowIfNull(toPoseName);
        return new PendingTransitionProposal(proposal, fromPoseName, toPoseName);
    }
}
