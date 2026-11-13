using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.GetPosePage;

/// <summary>The page of a published pose: its values, its version and its transitions from and to it (story 7, ADR 0030).</summary>
public sealed record GetPosePage(PoseId Id);

/// <summary>A published pose with its version, and its published transitions from and to it, each list in the order of the domain.</summary>
public sealed record PosePage(
    PoseId Id, PoseName Name, Difficulty Difficulty, FlowBoundaries Flow, PoseVersion Version,
    IReadOnlyList<LinkedTransition> TransitionsFrom, IReadOnlyList<LinkedTransition> TransitionsTo);
