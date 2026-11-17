using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Contribution.GetPendingTransitionProposalsCarryingTag;

/// <summary>The transition proposals pending validation that carry a tag, for the Catalog removing it (ADR 0033).</summary>
public sealed record GetPendingTransitionProposalsCarryingTag(TagId Tag);
