namespace AcroFunJam.Domain.Catalog;

/// <summary>The account of a validator or an administrator managing the photos and the videos (stories 10 and 12), as Identity knows it.</summary>
public readonly record struct CatalogManagerId(Guid Value);
