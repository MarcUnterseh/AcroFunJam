using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// Order of the validation queue, pose and revision proposals together (ADR 0027): the oldest submission first, then the
/// catalog order of the names they are known by (<see cref="IPendingProposal.QueuedName"/>), so that the order is deterministic (ADR 0017).
/// </summary>
public sealed class PendingProposalOrder : IComparer<IPendingProposal>
{
    public static PendingProposalOrder Instance { get; } = new();

    private PendingProposalOrder()
    {
    }

    public int Compare(IPendingProposal? x, IPendingProposal? y)
    {
        ArgumentNullException.ThrowIfNull(x);
        ArgumentNullException.ThrowIfNull(y);

        var bySubmission = x.SubmittedAt.CompareTo(y.SubmittedAt);
        return bySubmission != 0 ? bySubmission : PoseName.CatalogOrder.Compare(x.QueuedName, y.QueuedName);
    }
}
