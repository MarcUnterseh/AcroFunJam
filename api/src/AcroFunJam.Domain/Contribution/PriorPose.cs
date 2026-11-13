using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The values of a published pose when a revision of it is proposed (story 6, ADR 0026): kept as they were, so that the
/// contributor sees « avant → proposé » even once the pose has changed.
/// </summary>
public sealed record PriorPose(PoseName Name, Difficulty Difficulty, FlowBoundaries Flow);
