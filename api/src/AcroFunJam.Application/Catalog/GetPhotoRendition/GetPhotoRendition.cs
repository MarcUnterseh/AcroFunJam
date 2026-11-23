using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.GetPhotoRendition;

/// <summary>A generated size of a photo, for anybody (ADR 0039); a removed photo is no longer found, even by its address (R13).</summary>
public sealed record GetPhotoRendition(PhotoId Photo, PhotoRendition Rendition);
