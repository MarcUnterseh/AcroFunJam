using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// One of their proposals as « Mes propositions » orders it, whatever its kind (story 6, ADR 0027): when it was submitted, the
/// name it is listed under, and its identifier (version 7) for a deterministic order.
/// </summary>
public interface IMyProposal
{
    DateTimeOffset SubmittedAt { get; }

    PoseName ListedName { get; }

    Guid Identifier { get; }
}
