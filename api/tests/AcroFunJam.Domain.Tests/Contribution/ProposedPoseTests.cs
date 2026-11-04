using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

public sealed class ProposedPoseTests
{
    [Fact]
    public void Create_Should_KeepTheContent_When_ItIsValid()
    {
        var pose = ProposedPose.Create("Throne", "beginner", "discovery", canStartFlow: true, canEndFlow: false);

        pose.IsSuccess.ShouldBeTrue();
        pose.Value!.Name.Value.ShouldBe("Throne");
        pose.Value.Difficulty.ShouldBe(Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value);
        pose.Value.Flow.ShouldBe(FlowBoundaries.Create(canStartFlow: true, canEndFlow: false).Value);
    }

    [Theory]
    [InlineData(null, "pose.base-difficulty-required")]
    [InlineData("", "pose.base-difficulty-required")]
    [InlineData("expert", "pose.unknown-difficulty-level")]
    public void Create_Should_FailOnTheBaseDifficulty_When_ItIsMissingOrUnknown(string? baseDifficulty, string code)
    {
        ProposedPose.Create("Throne", baseDifficulty, "discovery", true, true).Error!.Code.ShouldBe(code);
    }

    [Theory]
    [InlineData(null, null, null, null, null, "pose.name-required")]
    [InlineData("Throne", null, null, null, null, "pose.base-difficulty-required")]
    [InlineData("Throne", "beginner", null, null, null, "pose.flyer-difficulty-required")]
    [InlineData("Throne", "beginner", "discovery", null, null, "pose.can-start-flow-required")]
    [InlineData("Throne", "beginner", "discovery", true, null, "pose.can-end-flow-required")]
    public void Create_Should_ReturnTheFirstError_When_SeveralInformationAreMissing(
        string? name, string? baseDifficulty, string? flyerDifficulty, bool? canStart, bool? canEnd, string code)
    {
        ProposedPose.Create(name, baseDifficulty, flyerDifficulty, canStart, canEnd).Error!.Code.ShouldBe(code);
    }

    [Theory]
    [InlineData(null, "pose.flyer-difficulty-required")]
    [InlineData("expert", "pose.unknown-difficulty-level")]
    public void Create_Should_FailOnTheFlyerDifficulty_When_ItIsMissingOrUnknown(string? flyerDifficulty, string code)
    {
        ProposedPose.Create("Throne", "beginner", flyerDifficulty, true, true).Error!.Code.ShouldBe(code);
    }

    [Fact]
    public void Retain_Should_ReplaceOnlyTheAdjustedValues_When_AdjustmentsAreGiven()
    {
        var throne = ProposedPose.Create("Throne", "beginner", "intermediate", canStartFlow: true, canEndFlow: true).Value!;
        var adjustments = PoseAdjustments.Create(name: null, baseDifficulty: null, "discovery", canStartFlow: null, canEndFlow: false).Value!;

        RetainedPose retained = throne.Retain(adjustments);

        retained.ShouldSatisfyAllConditions(
            () => retained.Name.ShouldBe(throne.Name),
            () => retained.Difficulty.ShouldBe(Difficulty.Create(DifficultyLevel.Beginner, DifficultyLevel.Discovery).Value),
            () => retained.Flow.ShouldBe(FlowBoundaries.Create(canStartFlow: true, canEndFlow: false).Value));
    }
}
