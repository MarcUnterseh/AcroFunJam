using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// A published transition of the catalog, an edge of its graph (story 7, ADR 0028): from a published pose to a published pose
/// (possibly the same, a washing machine), with an optional name, its difficulties and an optional description. It takes a place
/// between its poses, in its direction (ADR 0029): the unnamed one, or that of its name. Whether the poses are published and
/// whether the place is taken is given by the caller.
/// </summary>
public sealed class Transition : AggregateRoot<TransitionId>
{
    public PoseId FromPose { get; }

    public PoseId ToPose { get; }

    public TransitionName? Name { get; }

    public Difficulty Difficulty { get; }

    public TransitionDescription? Description { get; }

    public SourceProposalId? SourceProposalId { get; }

    public DateTimeOffset PublishedAt { get; }

    private Transition(
        TransitionId id, PoseId fromPose, PoseId toPose, TransitionName? name, Difficulty difficulty, TransitionDescription? description,
        SourceProposalId? source, DateTimeOffset publishedAt) : base(id)
    {
        FromPose = fromPose;
        ToPose = toPose;
        Name = name;
        Difficulty = difficulty;
        Description = description;
        SourceProposalId = source;
        PublishedAt = publishedAt;
    }

    /// <summary>The start pose is checked first, then the end pose, then the place of the transition.</summary>
    public static Result<Transition> Publish(
        TransitionId id, PoseId fromPose, PoseId toPose, TransitionName? name, Difficulty difficulty, TransitionDescription? description,
        SourceProposalId? source, bool fromPosePublished, bool toPosePublished, bool slotTaken, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(difficulty);
        if (!fromPosePublished) return CatalogErrors.FromPoseNotFound;
        if (!toPosePublished) return CatalogErrors.ToPoseNotFound;
        if (slotTaken) return name is null ? CatalogErrors.UnnamedTransitionTaken : CatalogErrors.TransitionNameTaken;

        var transition = new Transition(id, fromPose, toPose, name, difficulty, description, source, now);
        transition.Raise(new TransitionPublished(id, fromPose, toPose, name, source, now));
        return Result<Transition>.Success(transition);
    }
}
