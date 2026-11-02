using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Specs.Support.Catalog;

/// <summary>Exposes the poses seeded by the scenario behind the read port (ADR 0006). No business rule here.</summary>
internal sealed class SeededPublishedPosesReader(CatalogTestData catalog) : IPublishedPosesReader
{
    public Task<IReadOnlyList<PublishedPoseSummary>> GetPublishedPoses(CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<PublishedPoseSummary>>(
        [
            .. catalog.PublishedPoses.Select(p => new PublishedPoseSummary(
                new PoseId(Guid.NewGuid()),
                new PoseName(p.Name),
                ToLevel(p.BaseDifficulty),
                ToLevel(p.FlyerDifficulty))),
        ]);

    private static DifficultyLevel ToLevel(string code) => code switch
    {
        "discovery" => DifficultyLevel.Discovery,
        "beginner" => DifficultyLevel.Beginner,
        "intermediate" => DifficultyLevel.Intermediate,
        "advanced" => DifficultyLevel.Advanced,
        _ => throw new ArgumentOutOfRangeException(nameof(code), code, "Unknown difficulty code."),
    };
}
