namespace AcroFunJam.Domain.Contribution;

/// <summary>Where a proposal stands: pending validation, accepted (hence published) or rejected.</summary>
public enum ProposalStatus
{
    Pending,
    Accepted,
    Rejected,
}
