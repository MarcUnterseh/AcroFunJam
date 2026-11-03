using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.IsPoseNamePublished;

/// <summary>Whether a published pose has this name key (Open Host Service of the Catalog, ADR 0016).</summary>
public sealed record IsPoseNamePublished(PoseNameKey Key);
