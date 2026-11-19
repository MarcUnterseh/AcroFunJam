using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.Catalog.SeedInitialTagList;

internal sealed class SeedInitialTagListHandler(ITagListRepository lists, IUnitOfWork unitOfWork, TimeProvider clock)
    : ICommandHandler<SeedInitialTagList, bool>
{
    /// <returns>Whether the list has been seeded now.</returns>
    public async Task<Result<bool>> Handle(SeedInitialTagList command, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(command);
        var revision = command.Revision is { } number ? InitialTagList.Revision(number) : InitialTagList.Current;
        if (await lists.Get(ct) is { } existing)
        {
            if (!existing.Upgrade(revision, clock.GetUtcNow())) return Result<bool>.Success(false);
            lists.Update(existing);
            var upgraded = await unitOfWork.SaveChanges(ct);
            return upgraded.IsFailure ? upgraded.Error! : Result<bool>.Success(false);
        }

        lists.Add(TagList.Seed(revision, () => new TagId(Guid.CreateVersion7()), clock.GetUtcNow()));
        var saved = await unitOfWork.SaveChanges(ct);
        if (saved.IsFailure) return saved.Error!;
        return Result<bool>.Success(true);
    }
}
