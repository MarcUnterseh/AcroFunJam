using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>Usual name of a pose in the community (e.g. "Folded Leaf").</summary>
public sealed record PoseName
{
    public string Value { get; }

    private PoseName(string value) => Value = value;

    public static Result<PoseName> Create(string? raw)
    {
        var name = NameText.Normalize(raw);
        // A name made only of spaces, punctuation or symbols has an empty key: it is no name at all.
        if (PoseNameKey.Compute(name).Length == 0) return PoseContentErrors.NameRequired;
        if (NameText.IsLongerThan(name, MaxLength)) return PoseContentErrors.NameTooLong;
        return Result<PoseName>.Success(new PoseName(name));
    }

    /// <summary>Maximum length, in characters (code points) after normalisation.</summary>
    public const int MaxLength = 60;

    public PoseNameKey Key => PoseNameKey.From(this);

    /// <summary>
    /// Catalog order (provisional, see docs/domain/decouverte.md): the comparison key in ordinal order (ADR 0017);
    /// equivalent names are then ordered by their exact spelling so that the order is deterministic.
    /// </summary>
    public static IComparer<PoseName> CatalogOrder { get; } = Comparer<PoseName>.Create(CompareInCatalogOrder);

    private static int CompareInCatalogOrder(PoseName? left, PoseName? right)
    {
        if (ReferenceEquals(left, right)) return 0;
        if (left is null) return -1;
        if (right is null) return 1;

        var byKey = string.CompareOrdinal(left.Key.Value, right.Key.Value);
        return byKey != 0 ? byKey : string.CompareOrdinal(left.Value, right.Value);
    }
}
