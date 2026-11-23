using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.AddPosePhoto;

/// <summary>
/// A validator or an administrator adds a photo to a published pose (story 10, R1): the file as sent, its alternative text, its
/// credit and the confirmation of the rights.
/// </summary>
public sealed record AddPosePhoto(
    PoseId Pose, ReadOnlyMemory<byte> Content, string? AltText, string? Credit, bool RightsConfirmed, PhotoManagerId By);
