using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Application.Contribution.GetMyPoseProposals;

/// <summary>« Mes propositions »: the proposals submitted by <paramref name="Requester"/>, the most recently submitted first.</summary>
public sealed record GetMyPoseProposals(ContributorId Requester);
