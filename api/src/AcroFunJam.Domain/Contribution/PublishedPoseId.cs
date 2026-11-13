namespace AcroFunJam.Domain.Contribution;

/// <summary>Identifier of a published pose of the catalog, as Contribution designates it (story 6, ADR 0026).</summary>
public readonly record struct PublishedPoseId(Guid Value);
