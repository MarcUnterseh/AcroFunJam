using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.IsTransitionSlotPublished;

internal sealed class IsTransitionSlotPublishedHandler(ITransitionRepository transitions) : IQueryHandler<IsTransitionSlotPublished, bool>
{
    public async Task<Result<bool>> Handle(IsTransitionSlotPublished query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        return Result<bool>.Success(await transitions.IsSlotTaken(query.FromPose, query.ToPose, query.NameKey, ct));
    }
}
