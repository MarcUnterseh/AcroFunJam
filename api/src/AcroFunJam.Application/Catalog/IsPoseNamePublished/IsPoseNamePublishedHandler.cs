using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Catalog.IsPoseNamePublished;

internal sealed class IsPoseNamePublishedHandler(IPoseRepository poses) : IQueryHandler<IsPoseNamePublished, bool>
{
    public async Task<Result<bool>> Handle(IsPoseNamePublished query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        return Result<bool>.Success(await poses.IsNameTaken(query.Key, ct));
    }
}
