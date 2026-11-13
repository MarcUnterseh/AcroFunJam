using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.GetPublishedPose;

/// <summary>A published pose with its version, to start a revision of it (story 6, ADR 0024).</summary>
public sealed record GetPublishedPose(PoseId Id);

/// <summary>The values of a published pose and its version.</summary>
public sealed record PublishedPoseDetails(PoseId Id, PoseName Name, Difficulty Difficulty, FlowBoundaries Flow, PoseVersion Version);
