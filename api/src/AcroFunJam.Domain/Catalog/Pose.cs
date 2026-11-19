using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// A published pose of the catalog. Its name is unique in the catalog, in the sense of its comparison key;
/// whether another published pose has the name is given by the caller (ADR 0017).
/// </summary>
public sealed class Pose : AggregateRoot<PoseId>
{
    public PoseName Name { get; private set; }

    public Difficulty Difficulty { get; private set; }

    public FlowBoundaries Flow { get; private set; }

    public SourceProposalId? SourceProposalId { get; }

    public DateTimeOffset PublishedAt { get; }

    public PoseVersion Version { get; private set; } = PoseVersion.Initial;

    /// <summary>Its tags, each applying to the poses (story 9a, ADR 0036); none for a pose published before them.</summary>
    public TagSet Tags { get; private set; } = TagSet.Empty;

    private Pose(PoseId id, PoseName name, Difficulty difficulty, FlowBoundaries flow, SourceProposalId? source, DateTimeOffset publishedAt)
        : base(id)
    {
        Name = name;
        Difficulty = difficulty;
        Flow = flow;
        SourceProposalId = source;
        PublishedAt = publishedAt;
    }

    /// <summary>Publishes a pose, with the tags chosen for it through the list (story 9a): none unless chosen.</summary>
    public static Result<Pose> Publish(
        PoseId id, PoseName name, Difficulty difficulty, FlowBoundaries flow, SourceProposalId? source, bool nameAlreadyPublished, DateTimeOffset now,
        TagChoice? tags = null)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(difficulty);
        ArgumentNullException.ThrowIfNull(flow);
        if (tags is not null && TagNotApplicableError.Of(tags) is { } refused) return refused;
        if (nameAlreadyPublished) return CatalogErrors.PoseNameTaken;

        var pose = new Pose(id, name, difficulty, flow, source, now) { Tags = tags?.Tags ?? TagSet.Empty };
        pose.Raise(new PosePublished(id, name, source, now) { Tags = pose.Tags });
        return Result<Pose>.Success(pose);
    }

    /// <summary>
    /// A validator or an administrator replaces the tags of the pose (story 9a, D1 to D4): none removes them all. Refused while
    /// a revision of the pose is pending (given by the caller, read under the lock of the pose), or when a tag is not in the
    /// list or does not apply to the poses. A change makes a new version of the pose; the same set changes nothing.
    /// </summary>
    public Result<TagSet> Tag(TagChoice tags, bool revisionPending, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(tags);
        if (revisionPending) return CatalogErrors.PoseRevisionPending;
        if (TagNotApplicableError.Of(tags) is { } refused) return refused;
        if (tags.Tags == Tags) return Result<TagSet>.Success(Tags);

        Tags = tags.Tags;
        Version = Version.Next();
        Raise(new PoseTagged(Id, Version, Tags, now));
        return Result<TagSet>.Success(Tags);
    }

    /// <summary>
    /// Revises the pose from a revision proposal (story 6, ADR 0024, ADR 0026): it keeps its identity, takes the new values
    /// and its version increases. Refused when the pose changed since the version the revision started from, or when another
    /// published pose has the new name (given by the caller, ADR 0017). Story 9a: the retained tags, chosen again by the list for a
    /// pose, replace those of the pose; none keeps them.
    /// </summary>
    public Result<PoseVersion> Revise(
        PoseName name, Difficulty difficulty, FlowBoundaries flow, PoseVersion expected, bool nameTakenByAnotherPose, SourceProposalId source,
        DateTimeOffset now, TagChoice? tags = null)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(difficulty);
        ArgumentNullException.ThrowIfNull(flow);
        if (expected != Version) return CatalogErrors.PoseVersionMismatch;
        if (nameTakenByAnotherPose) return CatalogErrors.PoseNameTaken;
        if (tags is not null && TagNotApplicableError.Of(tags) is { } refused) return refused;

        Name = name;
        Difficulty = difficulty;
        Flow = flow;
        Tags = tags?.Tags ?? Tags;
        Version = Version.Next();
        Raise(new PoseRevised(Id, Version, name, source, now));
        return Result<PoseVersion>.Success(Version);
    }

    /// <summary>Restores a pose loaded from storage, with its version and its tags, without raising any event.</summary>
    public static Pose Rehydrate(
        PoseId id, PoseName name, Difficulty difficulty, FlowBoundaries flow, SourceProposalId? source, DateTimeOffset publishedAt, PoseVersion version,
        TagSet? tags = null) =>
        new(id, name, difficulty, flow, source, publishedAt) { Version = version, Tags = tags ?? TagSet.Empty };
}
