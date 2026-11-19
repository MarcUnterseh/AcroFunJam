using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>Read port: the published poses (story 9a) and transitions carrying the tags (story 8, ADR 0033, ADR 0034).</summary>
public interface ITagCarriersReader
{
    /// <summary>How many published transitions carry each tag; a tag carried by none is left out.</summary>
    Task<IReadOnlyDictionary<TagId, int>> PublishedTransitionCounts(CancellationToken ct);

    /// <summary>The published transitions carrying this tag, with the current names of their poses, in any order.</summary>
    Task<IReadOnlyList<CarryingTransition>> TransitionsCarrying(TagId tag, CancellationToken ct);

    /// <summary>How many published poses carry each tag; a tag carried by none is left out (story 9a, A7).</summary>
    Task<IReadOnlyDictionary<TagId, int>> PublishedPoseCounts(CancellationToken ct);

    /// <summary>The published poses carrying this tag, with their current names, in any order (story 9a, A4, A6).</summary>
    Task<IReadOnlyList<CarryingPose>> PosesCarrying(TagId tag, CancellationToken ct);
}
