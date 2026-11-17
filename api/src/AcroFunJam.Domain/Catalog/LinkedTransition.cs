using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// A published transition as the page of a pose presents it (story 7, ADR 0030): the other pose under its current name (the
/// end pose of a transition from the pose, the start pose of a transition to it), and the transition itself.
/// </summary>
public sealed record LinkedTransition(
    TransitionId Id, PoseId OtherPose, PoseName OtherPoseName, TransitionName? Name, Difficulty Difficulty, TransitionDescription? Description,
    TagSet Tags);

/// <summary>
/// The order of the transitions on the page of a pose (C3): the other pose in the order of the catalog, then the name, the
/// unnamed transition first; total, since two transitions never share a place (ADR 0029).
/// </summary>
public sealed class LinkedTransitionsOrder : IComparer<LinkedTransition>
{
    public static LinkedTransitionsOrder Instance { get; } = new();

    private LinkedTransitionsOrder() { }

    public int Compare(LinkedTransition? x, LinkedTransition? y)
    {
        if (ReferenceEquals(x, y)) return 0;
        if (x is null) return -1;
        if (y is null) return 1;

        var byPose = PoseName.CatalogOrder.Compare(x.OtherPoseName, y.OtherPoseName);
        if (byPose != 0) return byPose;
        return (x.Name, y.Name) switch
        {
            (null, null) => 0,
            (null, _) => -1,
            (_, null) => 1,
            var (left, right) => CompareNames(left, right),
        };
    }

    private static int CompareNames(TransitionName left, TransitionName right)
    {
        var byKey = string.CompareOrdinal(left.Key.Value, right.Key.Value);
        return byKey != 0 ? byKey : string.CompareOrdinal(left.Value, right.Value);
    }
}
