using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetMyProposals;

/// <summary>
/// « Mes propositions »: the pose proposals and revision proposals submitted by <paramref name="Requester"/>, the most recently
/// submitted first (story 6, ADR 0027).
/// </summary>
public sealed record GetMyProposals(ContributorId Requester);
