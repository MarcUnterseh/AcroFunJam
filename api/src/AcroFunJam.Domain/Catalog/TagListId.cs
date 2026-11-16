namespace AcroFunJam.Domain.Catalog;

/// <summary>Identifier of the list of tags: there is a single one, that of the catalog (ADR 0032).</summary>
public readonly record struct TagListId(Guid Value)
{
    public static TagListId Catalog { get; } = new(new Guid("6f1d2c6e-8a3b-4c5d-9e7f-0a1b2c3d4e5f"));
}
