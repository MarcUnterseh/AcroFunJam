using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// Order of the validation queue: the oldest submission first, then the catalog order of the proposed names, so that
/// the order is deterministic (ADR 0017).
/// </summary>
public sealed class PendingProposalOrder : IComparer<PoseProposal>
{
    public static PendingProposalOrder Instance { get; } = new();

    private PendingProposalOrder()
    {
    }

    public int Compare(PoseProposal? x, PoseProposal? y)
    {
        ArgumentNullException.ThrowIfNull(x);
        ArgumentNullException.ThrowIfNull(y);

        var bySubmission = x.SubmittedAt.CompareTo(y.SubmittedAt);
        return bySubmission != 0 ? bySubmission : PoseName.CatalogOrder.Compare(x.Pose.Name, y.Pose.Name);
    }
}
