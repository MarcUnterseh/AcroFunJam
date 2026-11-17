using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.TagTransition;

/// <summary>A validator or an administrator chooses the tags of a published transition directly (story 8, P2, ADR 0033).</summary>
public sealed record TagTransition(TransitionId Transition, IReadOnlyCollection<TagId> Tags);
