using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>
/// A published pose of the catalog. Its name is unique in the catalog, in the sense of its comparison key;
/// whether another published pose has the name is given by the caller (ADR 0017).
/// </summary>
public sealed class Pose : AggregateRoot<PoseId>
{
    public PoseName Name { get; }

    public Difficulty Difficulty { get; }

    public FlowBoundaries Flow { get; }

    public SourceProposalId? SourceProposalId { get; }

    public DateTimeOffset PublishedAt { get; }

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
}
