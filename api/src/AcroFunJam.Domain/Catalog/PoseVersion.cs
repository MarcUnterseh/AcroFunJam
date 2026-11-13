namespace AcroFunJam.Domain.Catalog;

/// <summary>Version of a published pose: 1 at publication, incremented at each revision (ADR 0024).</summary>
public sealed record PoseVersion
{
    public int Value { get; }

    public static PoseVersion Initial { get; } = new(1);

    /// <summary>The version after a revision (ADR 0024).</summary>
    public PoseVersion Next() => new(Value + 1);

    /// <summary>A version read back from storage: always 1 or more.</summary>
    public static PoseVersion Of(int value) =>
        value >= 1 ? new PoseVersion(value) : throw new ArgumentOutOfRangeException(nameof(value), value, "A pose version is 1 or more.");

    private PoseVersion(int value) => Value = value;
}
