using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Specs.Support.Catalog;

/// <summary>Exposes the poses seeded by the scenario behind the read port (ADR 0006). No business rule here.</summary>
internal sealed class SeededPublishedPosesReader(CatalogTestData catalog) : IPublishedPosesReader
{
    public Task<IReadOnlyList<PublishedPoseSummary>> GetPublishedPoses(CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<PublishedPoseSummary>>(
        [
            .. catalog.PublishedPoses.Select(p => new PublishedPoseSummary(
                new PoseId(Guid.NewGuid()),
                PoseName.Create(p.Name).Value!,
                DifficultyLevel.FromCode(p.BaseDifficulty).Value,
                DifficultyLevel.FromCode(p.FlyerDifficulty).Value,
                FlowBoundaries.Create(p.CanStartFlow, p.CanEndFlow).Value!)),
        ]);
}
