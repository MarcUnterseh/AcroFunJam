using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.GetPublishedPoseNames;

internal sealed class GetPublishedPoseNamesHandler(IPoseRepository poses) : IQueryHandler<GetPublishedPoseNames, IReadOnlyDictionary<PoseId, PoseName>>
{
    public async Task<Result<IReadOnlyDictionary<PoseId, PoseName>>> Handle(GetPublishedPoseNames query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        return Result<IReadOnlyDictionary<PoseId, PoseName>>.Success(await poses.NamesOf(query.Ids, ct));
    }
}
