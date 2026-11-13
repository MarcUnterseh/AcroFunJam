namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// Comparison key of a transition name: the algorithm of <see cref="PoseNameKey"/> (ADR 0017), a distinct type so that a
/// transition key never serves the uniqueness of a pose (ADR 0028). Never displayed.
/// </summary>
public sealed record TransitionNameKey
{
    public string Value { get; }

    private TransitionNameKey(string value) => Value = value;

    public static TransitionNameKey From(TransitionName name)
    {
        ArgumentNullException.ThrowIfNull(name);
        return new TransitionNameKey(PoseNameKey.Compute(name.Value));
    }
}
