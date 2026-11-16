namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// Comparison key of a tag name: the algorithm of <see cref="PoseNameKey"/> (ADR 0017), a distinct type so that a tag key
/// never serves the uniqueness of a pose (ADR 0032). Never displayed.
/// </summary>
public sealed record TagNameKey
{
    public string Value { get; }

    private TagNameKey(string value) => Value = value;

    public static TagNameKey From(TagName name)
    {
        ArgumentNullException.ThrowIfNull(name);
        return new TagNameKey(PoseNameKey.Compute(name.Value));
    }
}
