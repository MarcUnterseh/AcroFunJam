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

    private Pose(PoseId id, PoseName name, Difficulty difficulty, FlowBoundaries flow, SourceProposalId? source, DateTimeOffset publishedAt)
        : base(id)
    {
        Name = name;
        Difficulty = difficulty;
        Flow = flow;
        SourceProposalId = source;
        PublishedAt = publishedAt;
    }

    public static Result<Pose> Publish(
        PoseId id, PoseName name, Difficulty difficulty, FlowBoundaries flow, SourceProposalId? source, bool nameAlreadyPublished, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(difficulty);
        ArgumentNullException.ThrowIfNull(flow);
        if (nameAlreadyPublished) return CatalogErrors.PoseNameTaken;

        var pose = new Pose(id, name, difficulty, flow, source, now);
        pose.Raise(new PosePublished(id, name, source, now));
        return Result<Pose>.Success(pose);
    }

    /// <summary>
    /// Revises the pose from a revision proposal (story 6, ADR 0024, ADR 0026): it keeps its identity, takes the new values
    /// and its version increases. Refused when the pose changed since the version the revision started from, or when another
    /// published pose has the new name (given by the caller, ADR 0017).
    /// </summary>
    public Result<PoseVersion> Revise(
        PoseName name, Difficulty difficulty, FlowBoundaries flow, PoseVersion expected, bool nameTakenByAnotherPose, SourceProposalId source,
        DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(name);
        ArgumentNullException.ThrowIfNull(difficulty);
        ArgumentNullException.ThrowIfNull(flow);
        if (expected != Version) return CatalogErrors.PoseVersionMismatch;
        if (nameTakenByAnotherPose) return CatalogErrors.PoseNameTaken;

        Name = name;
        Difficulty = difficulty;
        Flow = flow;
        Version = Version.Next();
        Raise(new PoseRevised(Id, Version, name, source, now));
        return Result<PoseVersion>.Success(Version);
    }

    /// <summary>Restores a pose loaded from storage, with its version, without raising any event.</summary>
    public static Pose Rehydrate(
        PoseId id, PoseName name, Difficulty difficulty, FlowBoundaries flow, SourceProposalId? source, DateTimeOffset publishedAt, PoseVersion version) =>
        new(id, name, difficulty, flow, source, publishedAt) { Version = version };
}
