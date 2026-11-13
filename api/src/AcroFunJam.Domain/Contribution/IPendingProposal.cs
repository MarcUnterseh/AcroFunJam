using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A proposal as the validation queue orders it, whatever its kind (story 6, ADR 0027): when it was submitted, and the name
/// it is known by, the proposed pose for a pose proposal, the pose before the revision for a revision proposal.
/// </summary>
public interface IPendingProposal
{
    DateTimeOffset SubmittedAt { get; }

    PoseName QueuedName { get; }
}
