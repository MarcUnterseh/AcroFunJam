using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

public sealed class DifficultyTests
{
    [Fact]
    public void Create_Should_ExposeTheBaseAndFlyerDifficulties_When_BothAreGiven()
    {
        var difficulty = Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery);

        difficulty.IsSuccess.ShouldBeTrue();
        difficulty.Value!.Base.ShouldBe(DifficultyLevel.Beginner);
        difficulty.Value.Flyer.ShouldBe(DifficultyLevel.Discovery);
    }

    [Theory]
    [InlineData(DifficultyLevel.Discovery, DifficultyLevel.Discovery)]
    [InlineData(DifficultyLevel.Beginner, DifficultyLevel.Intermediate)]
    [InlineData(DifficultyLevel.Intermediate, DifficultyLevel.Advanced)]
    [InlineData(DifficultyLevel.Advanced, DifficultyLevel.Advanced)]
    public void Create_Should_AcceptEveryLevel_When_BaseAndFlyerAreTheSameOrDiffer(DifficultyLevel @base, DifficultyLevel flyer)
    {
        var difficulty = Difficulty.Create(@base, flyer).Value!;

        difficulty.Base.ShouldBe(@base);
        difficulty.Flyer.ShouldBe(flyer);
    }

    [Fact]
    public void Create_Should_FailWithBaseDifficultyRequired_When_TheBaseIsMissing()
    {
        Difficulty.Create(null, DifficultyLevel.Discovery).Error.ShouldBe(PoseContentErrors.BaseDifficultyRequired);
    }

    [Fact]
    public void Create_Should_FailWithFlyerDifficultyRequired_When_TheFlyerIsMissing()
    {
        Difficulty.Create(DifficultyLevel.Beginner, null).Error.ShouldBe(PoseContentErrors.FlyerDifficultyRequired);
    }
}
