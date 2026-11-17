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

    /// <summary>Its tags (story 8, ADR 0033), replaced as a whole by a validator.</summary>
    public TagSet Tags { get; private set; }

    public SourceProposalId? SourceProposalId { get; }

    public DateTimeOffset PublishedAt { get; }

    private Transition(
        TransitionId id, PoseId fromPose, PoseId toPose, TransitionName? name, Difficulty difficulty, TransitionDescription? description,
        TagSet tags, SourceProposalId? source, DateTimeOffset publishedAt) : base(id)
    {
        Tags = tags;
        FromPose = fromPose;
        ToPose = toPose;
        Name = name;
        Difficulty = difficulty;
        Description = description;
        SourceProposalId = source;
        PublishedAt = publishedAt;
    }

    /// <summary>
    /// The start pose is checked first, then the end pose, then the tags (chosen through the list, ADR 0033), then the place of
    /// the transition.
    /// </summary>
    public static Result<Transition> Publish(
        TransitionId id, PoseId fromPose, PoseId toPose, TransitionName? name, Difficulty difficulty, TransitionDescription? description,
        TagChoice tags, SourceProposalId? source, bool fromPosePublished, bool toPosePublished, bool slotTaken, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(difficulty);
        ArgumentNullException.ThrowIfNull(tags);
        if (!fromPosePublished) return CatalogErrors.FromPoseNotFound;
        if (!toPosePublished) return CatalogErrors.ToPoseNotFound;
        if (!tags.IsValid) return new TagNotInListError(tags.NotInList);
        if (slotTaken) return name is null ? CatalogErrors.UnnamedTransitionTaken : CatalogErrors.TransitionNameTaken;

        var transition = new Transition(id, fromPose, toPose, name, difficulty, description, tags.Tags, source, now);
        transition.Raise(new TransitionPublished(id, fromPose, toPose, name, tags.Tags, source, now));
        return Result<Transition>.Success(transition);
    }

    /// <summary>
    /// A validator replaces the tags of the published transition (P2): an empty choice removes them all; the last action wins,
    /// without version, author nor history (decision 11).
    /// </summary>
    public Result<TagSet> Tag(TagChoice tags, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(tags);
        if (!tags.IsValid) return new TagNotInListError(tags.NotInList);

        Tags = tags.Tags;
        Raise(new TransitionTagged(Id, Tags, now));
        return Result<TagSet>.Success(Tags);
    }

    /// <summary>Restores a transition loaded from storage, without raising any event.</summary>
    public static Transition Rehydrate(
        TransitionId id, PoseId fromPose, PoseId toPose, TransitionName? name, Difficulty difficulty, TransitionDescription? description,
        TagSet tags, SourceProposalId? source, DateTimeOffset publishedAt) =>
        new(id, fromPose, toPose, name, difficulty, description, tags, source, publishedAt);
}
