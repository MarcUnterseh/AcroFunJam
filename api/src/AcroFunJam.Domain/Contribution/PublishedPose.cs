namespace AcroFunJam.Domain.Contribution;

/// <summary>A published pose of the catalog as Contribution reads it, to revise it (story 6, ADR 0024, ADR 0026).</summary>
public sealed record PublishedPose(PublishedPoseId Id, PriorPose Values, PublishedPoseVersion Version);
