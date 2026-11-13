using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// Order of « Mes propositions » (story 5, Q20, ADR 0023): the most recently submitted first, then the catalog order of the
/// presented names (the retained name once accepted), then the most recent identifier (version 7), so that the order is
/// deterministic.
/// </summary>
public sealed class MyProposalsOrder : IComparer<IMyProposal>
{
    public static MyProposalsOrder Instance { get; } = new();

    private MyProposalsOrder()
    {
    }

    public int Compare(IMyProposal? x, IMyProposal? y)
    {
        ArgumentNullException.ThrowIfNull(x);
        ArgumentNullException.ThrowIfNull(y);
        var bySubmission = y.SubmittedAt.CompareTo(x.SubmittedAt);
        if (bySubmission != 0) return bySubmission;
        var byName = PoseName.CatalogOrder.Compare(x.ListedName, y.ListedName);
        return byName != 0 ? byName : y.Identifier.CompareTo(x.Identifier);
    }
}
