using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.RemovePosePhoto;

/// <summary>A validator or an administrator removes a photo of a pose, at once (story 10, R13).</summary>
public sealed record RemovePosePhoto(PoseId Pose, PhotoId Photo);
