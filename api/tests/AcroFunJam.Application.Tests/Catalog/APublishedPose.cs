using AcroFunJam.Application.Catalog.ListPublishedPoses;
using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Application.Tests.Catalog;

/// <summary>Test data builder for <see cref="PublishedPoseSummary"/>.</summary>
internal sealed class APublishedPose
{
    private readonly string _name;
    private DifficultyLevel _baseDifficulty = DifficultyLevel.Discovery;
    private DifficultyLevel _flyerDifficulty = DifficultyLevel.Discovery;

    private APublishedPose(string name) => _name = name;

    public static APublishedPose Named(string name) => new(name);

    public APublishedPose WithBaseDifficulty(DifficultyLevel difficulty)
    {
        _baseDifficulty = difficulty;
        return this;
    }

    public APublishedPose WithFlyerDifficulty(DifficultyLevel difficulty)
    {
        _flyerDifficulty = difficulty;
        return this;
    }

    public PublishedPoseSummary Build() =>
        new(new PoseId(Guid.NewGuid()), new PoseName(_name), _baseDifficulty, _flyerDifficulty);
}
