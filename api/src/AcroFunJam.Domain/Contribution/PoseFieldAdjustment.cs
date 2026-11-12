using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A field of the pose that a validator adjusted before accepting a proposal, with its proposed value and its retained value
/// (story 5, ADR 0023). Closed: one kind per field of the form, defined here only.
/// </summary>
public abstract record PoseFieldAdjustment
{
    private protected PoseFieldAdjustment()
    {
    }
}

public sealed record NameAdjustment(PoseName Proposed, PoseName Retained) : PoseFieldAdjustment;

public sealed record BaseDifficultyAdjustment(DifficultyLevel Proposed, DifficultyLevel Retained) : PoseFieldAdjustment;

public sealed record FlyerDifficultyAdjustment(DifficultyLevel Proposed, DifficultyLevel Retained) : PoseFieldAdjustment;

public sealed record CanStartFlowAdjustment(bool Proposed, bool Retained) : PoseFieldAdjustment;

public sealed record CanEndFlowAdjustment(bool Proposed, bool Retained) : PoseFieldAdjustment;
