using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Catalog;

/// <summary>EF Core adapter of <see cref="ITransitionRepository"/> (ADR 0028).</summary>
public sealed class EfTransitionRepository(AcroFunJamDbContext context, TrackedAggregates aggregates) : ITransitionRepository
{
    public void Add(Transition transition)
    {
        ArgumentNullException.ThrowIfNull(transition);
        context.Set<TransitionRecord>().Add(new TransitionRecord
        {
            Id = transition.Id.Value,
            FromPoseId = transition.FromPose.Value,
            ToPoseId = transition.ToPose.Value,
            Name = transition.Name?.Value,
            NameKey = transition.Name?.Key.Value,
            BaseDifficulty = transition.Difficulty.Base.ToCode(),
            FlyerDifficulty = transition.Difficulty.Flyer.ToCode(),
            Description = transition.Description?.Value,
            SourceProposalId = transition.SourceProposalId?.Value,
            PublishedAt = transition.PublishedAt,
        });
        aggregates.Track(transition);
    }

    public Task<bool> IsSlotTaken(PoseId from, PoseId to, TransitionNameKey? nameKey, CancellationToken ct)
    {
        var key = nameKey?.Value;
        return context.Set<TransitionRecord>().AnyAsync(t => t.FromPoseId == from.Value && t.ToPoseId == to.Value && t.NameKey == key, ct);
    }
}
