using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution.GetPendingPoseRevisionsCarryingTag;

/// <summary>The pose revisions pending validation whose revised pose carries a tag, for the Catalog removing or narrowing it (story 9a, ADR 0036).</summary>
public sealed record GetPendingPoseRevisionsCarryingTag(TagId Tag);
