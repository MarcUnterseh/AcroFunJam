using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.CorrectPhoto;

/// <summary>
/// A validator or an administrator corrects the alternative text and the credit of a photo, with the rules of an addition
/// (story 10, R14); changing the file is removing then adding.
/// </summary>
public sealed record CorrectPhoto(PoseId Pose, PhotoId Photo, string? AltText, string? Credit);
