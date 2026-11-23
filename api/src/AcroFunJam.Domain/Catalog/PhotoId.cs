namespace AcroFunJam.Domain.Catalog;

/// <summary>Identifier of a photo of a pose; its generated sizes never change (ADR 0039).</summary>
public readonly record struct PhotoId(Guid Value);
