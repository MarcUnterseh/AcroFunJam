using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution.GetPendingPoseProposalsCarryingTag;

/// <summary>The pose proposals pending validation that carry a tag, for the Catalog removing or narrowing it (story 9a, ADR 0036).</summary>
public sealed record GetPendingPoseProposalsCarryingTag(TagId Tag);
