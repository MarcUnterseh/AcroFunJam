using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.ChooseMainPhoto;

/// <summary>A validator or an administrator chooses the main photo of a pose, its thumbnail in the catalog (story 10, R12).</summary>
public sealed record ChooseMainPhoto(PoseId Pose, PhotoId Photo);
