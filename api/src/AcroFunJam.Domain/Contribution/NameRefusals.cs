using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>What a taken name means for a proposal, whatever its kind (pose or revision proposal, ADR 0017, ADR 0025).</summary>
internal static class NameRefusals
{
    public static Error? Of(NameAvailability availability) => availability switch
    {
        NameAvailability.TakenByPublishedPose => ContributionErrors.PoseNameAlreadyInCatalog,
        NameAvailability.TakenByPendingProposal => ContributionErrors.PoseNameAlreadyPending,
        _ => null,
    };
}
