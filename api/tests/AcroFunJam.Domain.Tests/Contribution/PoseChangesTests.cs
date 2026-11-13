using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>The values a contributor changes in a published pose follow the content rules of a pose (story 6, R6).</summary>
public sealed class PoseChangesTests
{
    [Fact]
    public void Create_Should_KeepOnlyTheGivenValues_When_TheOthersAreAbsent()
    {
        var changes = PoseChanges.Create(name: null, baseDifficulty: null, flyerDifficulty: "discovery", canStartFlow: null, canEndFlow: false);

        changes.Value.ShouldNotBeNull().ShouldSatisfyAllConditions(
            c => c.Name.ShouldBeNull(),
            c => c.BaseDifficulty.ShouldBeNull(),
            c => c.FlyerDifficulty.ShouldBe(DifficultyLevel.Discovery),
            c => c.CanStartFlow.ShouldBeNull(),
            c => c.CanEndFlow.ShouldBe(false));
    }

    [Theory]
    [InlineData("")]
    [InlineData("---")]
    public void Create_Should_FailWithNameRequired_When_TheNameIsEmptyOrOnlyPunctuation(string name)
    {
        var changes = PoseChanges.Create(name, baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null);

        changes.Error.ShouldBe(PoseContentErrors.NameRequired);
    }

    [Fact]
    public void Create_Should_FailWithUnknownDifficultyLevel_When_TheBaseDifficultyIsNotOnTheScale()
    {
        var changes = PoseChanges.Create(name: null, baseDifficulty: "expert", flyerDifficulty: null, canStartFlow: null, canEndFlow: null);

        changes.Error.ShouldBe(PoseContentErrors.UnknownDifficultyLevel("expert"));
    }

    [Fact]
    public void Create_Should_FailWithUnknownDifficultyLevel_When_TheFlyerDifficultyIsNotOnTheScale()
    {
        var changes = PoseChanges.Create(name: null, baseDifficulty: null, flyerDifficulty: "expert", canStartFlow: null, canEndFlow: null);

        changes.Error.ShouldBe(PoseContentErrors.UnknownDifficultyLevel("expert"));
    }
}
