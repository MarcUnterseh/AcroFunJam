using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A field of the pose that a revision changes, with its value before and after (story 6, ADR 0026). Same shape as
/// <see cref="PoseFieldAdjustment"/> but another term of the language: a change goes from the pose to the revision, an
/// adjustment from the proposed values to the retained ones. Closed: one kind per field of the form, defined here only.
/// </summary>
public abstract record PoseFieldChange
{
    private protected PoseFieldChange()
    {
    }
}

public sealed record NameChange(PoseName Before, PoseName After) : PoseFieldChange;

public sealed record BaseDifficultyChange(DifficultyLevel Before, DifficultyLevel After) : PoseFieldChange;

public sealed record FlyerDifficultyChange(DifficultyLevel Before, DifficultyLevel After) : PoseFieldChange;

public sealed record CanStartFlowChange(bool Before, bool After) : PoseFieldChange;

public sealed record CanEndFlowChange(bool Before, bool After) : PoseFieldChange;
