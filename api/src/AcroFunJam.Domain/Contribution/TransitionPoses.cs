using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// The oriented couple of poses of a transition, that is its direction (story 7, R4 to R6, ADR 0028): from its start pose to
/// its end pose, possibly the same (a washing machine). Never adjusted by a validator.
/// </summary>
public sealed record TransitionPoses(PublishedPoseId From, PublishedPoseId To)
{
    /// <summary>Both poses are required; the start pose is checked first.</summary>
    public static Result<TransitionPoses> Create(Guid? from, Guid? to)
    {
        if (from is null) return ContributionErrors.FromPoseRequired;
        if (to is null) return ContributionErrors.ToPoseRequired;
        return Result<TransitionPoses>.Success(new TransitionPoses(new PublishedPoseId(from.Value), new PublishedPoseId(to.Value)));
    }
}
