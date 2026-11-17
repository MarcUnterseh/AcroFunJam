using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog;

/// <summary>Read port: the published transitions carrying the tags (story 8, ADR 0033, ADR 0034).</summary>
public interface ITagCarriersReader
{
    /// <summary>How many published transitions carry each tag; a tag carried by none is left out.</summary>
    Task<IReadOnlyDictionary<TagId, int>> PublishedTransitionCounts(CancellationToken ct);

    /// <summary>The published transitions carrying this tag, with the current names of their poses, in any order.</summary>
    Task<IReadOnlyList<CarryingTransition>> TransitionsCarrying(TagId tag, CancellationToken ct);
}
