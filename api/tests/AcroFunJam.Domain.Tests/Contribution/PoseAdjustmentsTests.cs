using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

public sealed class PoseAdjustmentsTests
{
    [Fact]
    public void Create_Should_KeepEveryValueOpen_When_NoValueIsGiven()
    {
        var adjustments = PoseAdjustments.Create(name: null, baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null);

        adjustments.Value.ShouldBe(PoseAdjustments.None);
        adjustments.Value.ShouldNotBeNull().ShouldSatisfyAllConditions(
            a => a.Name.ShouldBeNull(),
            a => a.BaseDifficulty.ShouldBeNull(),
            a => a.FlyerDifficulty.ShouldBeNull(),
            a => a.CanStartFlow.ShouldBeNull(),
            a => a.CanEndFlow.ShouldBeNull());
    }

    [Theory]
    [InlineData("")]
    [InlineData("---")]
    public void Create_Should_FailWithNameRequired_When_TheAdjustedNameIsEmptyOrOnlyPunctuation(string adjustedName)
    {
        var adjustments = PoseAdjustments.Create(adjustedName, baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null);

        adjustments.Error.ShouldBe(PoseContentErrors.NameRequired);
    }

    [Fact]
    public void Create_Should_FailWithNameTooLong_When_TheAdjustedNameHas61Characters()
    {
        var adjustments = PoseAdjustments.Create(
            "Pose " + new string('x', 56), baseDifficulty: null, flyerDifficulty: null, canStartFlow: null, canEndFlow: null);

        adjustments.Error.ShouldBe(PoseContentErrors.NameTooLong);
    }

    [Theory]
    [InlineData("expert", null)]
    [InlineData(null, "expert")]
    public void Create_Should_FailWithUnknownDifficultyLevel_When_TheAdjustedDifficultyIsExpert(string? baseDifficulty, string? flyerDifficulty)
    {
        var adjustments = PoseAdjustments.Create(name: null, baseDifficulty, flyerDifficulty, canStartFlow: null, canEndFlow: null);

        adjustments.Error.ShouldBe(PoseContentErrors.UnknownDifficultyLevel("expert"));
    }
}
