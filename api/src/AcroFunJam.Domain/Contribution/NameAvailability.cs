namespace AcroFunJam.Domain.Contribution;

/// <summary>Whether the name of a proposed pose is free, given by the caller to <see cref="PoseProposal.Submit"/>.</summary>
public enum NameAvailability
{
    Available,
    TakenByPublishedPose,
    TakenByPendingProposal,
}

public static class NameAvailabilityRule
{
    extension(NameAvailability)
    {
        /// <summary>When the name is taken both by a published pose and by a pending proposal, the catalog prevails.</summary>
        public static NameAvailability From(bool publishedInCatalog, bool pendingProposal) =>
            publishedInCatalog ? NameAvailability.TakenByPublishedPose
            : pendingProposal ? NameAvailability.TakenByPendingProposal
            : NameAvailability.Available;
    }
}
