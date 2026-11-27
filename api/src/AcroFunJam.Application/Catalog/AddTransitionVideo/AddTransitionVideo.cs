using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Catalog.AddTransitionVideo;

/// <summary>
/// A validator or an administrator adds a video to a published transition (story 12, V1): the file as sent (copied to a local
/// file by the Api, never held in memory), its caption, its credit, its optional description and the confirmation of the rights.
/// </summary>
public sealed record AddTransitionVideo(
    TransitionId Transition, VideoUpload? File, string? Caption, string? Credit, string? Description, bool RightsConfirmed, CatalogManagerId By);

/// <summary>The file of a video as sent, on the local disk, and its weight (ADR 0041).</summary>
public sealed record VideoUpload(string Path, long Length);
