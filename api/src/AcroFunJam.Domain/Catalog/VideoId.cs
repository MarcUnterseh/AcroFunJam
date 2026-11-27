namespace AcroFunJam.Domain.Catalog;

/// <summary>Identifier of a video of a transition (UUID v7); its prepared files never change (ADR 0041).</summary>
public readonly record struct VideoId(Guid Value);
