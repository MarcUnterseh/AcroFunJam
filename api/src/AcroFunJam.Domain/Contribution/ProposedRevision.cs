using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The content of a pose revision proposal (story 6, ADR 0026): the values of the pose before it and the pose as revised.
/// </summary>
public sealed record ProposedRevision
{
    public PriorPose Before { get; }

    public ProposedPose After { get; }

    /// <summary>
    /// The fields the revision changes, in the order of the form, each with its value before and after; never empty. Compared
    /// once normalised: a change of case of the name is one (ordinal comparison).
    /// </summary>
    public IReadOnlyList<PoseFieldChange> Changes => PoseFieldChanges.Between(Before, After.Name, After.Difficulty, After.Flow);

    /// <summary>The name key the revision reserves while pending (ADR 0025): none when the key of the name does not change.</summary>
    public PoseNameKey? ReservedNameKey => After.Name.Key == Before.Name.Key ? null : After.Name.Key;

    private ProposedRevision(PriorPose before, ProposedPose after)
    {
        Before = before;
        After = after;
    }

    /// <summary>A proposed revision read back from storage, as it was recorded.</summary>
    public static ProposedRevision Restore(PriorPose before, ProposedPose after) => new(before, after);

    public static Result<ProposedRevision> Of(PriorPose before, PoseChanges changes)
    {
        ArgumentNullException.ThrowIfNull(before);
        ArgumentNullException.ThrowIfNull(changes);
        var after = ProposedPose.From(
            changes.Name ?? before.Name,
            Difficulty.Create(changes.BaseDifficulty ?? before.Difficulty.Base, changes.FlyerDifficulty ?? before.Difficulty.Flyer).Value!,
            FlowBoundaries.Create(changes.CanStartFlow ?? before.Flow.CanStartFlow, changes.CanEndFlow ?? before.Flow.CanEndFlow).Value!);
        // Compared once normalised (story 4, Q15): superfluous spaces are no change, a change of case of the name is one.
        if (after.Name == before.Name && after.Difficulty == before.Difficulty && after.Flow == before.Flow)
            return ContributionErrors.RevisionChangesNothing;
        return Result<ProposedRevision>.Success(new ProposedRevision(before, after));
    }
}
