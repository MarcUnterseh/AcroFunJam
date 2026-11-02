namespace AcroFunJam.Domain.Catalog;

/// <summary>Usual name of a pose in the community (e.g. "Folded Leaf").</summary>
public sealed record PoseName(string Value)
{
    /// <summary>
    /// Catalog order (provisional, see docs/domain/decouverte.md): alphabetical, ignoring case and hyphens;
    /// equivalent names are then ordered by their exact spelling so that the order is deterministic.
    /// </summary>
    public static IComparer<PoseName> CatalogOrder { get; } = Comparer<PoseName>.Create(CompareInCatalogOrder);

    private static int CompareInCatalogOrder(PoseName? left, PoseName? right)
    {
        if (ReferenceEquals(left, right)) return 0;
        if (left is null) return -1;
        if (right is null) return 1;

        var bySortKey = string.Compare(SortKey(left.Value), SortKey(right.Value), StringComparison.OrdinalIgnoreCase);
        return bySortKey != 0 ? bySortKey : string.CompareOrdinal(left.Value, right.Value);
    }

    private static string SortKey(string name) => name.Replace("-", string.Empty, StringComparison.Ordinal);
}
