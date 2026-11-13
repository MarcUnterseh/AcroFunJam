using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>The content of a transition proposal (story 7, R8, R11, R12, ADR 0028).</summary>
public sealed class ProposedTransitionTests
{
    [Fact]
    public void Create_Should_KeepTheNormalisedValues_When_TheyAreValid()
    {
        var transition = ProposedTransition.Create(" Ninja  Star ", "advanced", "intermediate", " Rotation complète.\n").Value!;

        transition.Name!.Value.ShouldBe("Ninja Star");
        transition.Difficulty.ShouldBe(Difficulty.Create(DifficultyLevel.Advanced, DifficultyLevel.Intermediate).Value);
        transition.Description!.Value.ShouldBe("Rotation complète.");
    }

    [Fact]
    public void Create_Should_HaveNeitherNameNorDescription_When_NoneIsGiven()
    {
        var transition = ProposedTransition.Create(name: null, "beginner", "beginner", description: "  ").Value!;

        transition.Name.ShouldBeNull();
        transition.Description.ShouldBeNull();
    }

    [Theory]
    [InlineData(null, "beginner", "pose.base-difficulty-required")]
    [InlineData("beginner", null, "pose.flyer-difficulty-required")]
    [InlineData("expert", "beginner", "pose.unknown-difficulty-level")]
    public void Create_Should_FailWithTheRuleOfTheScale_When_ADifficultyIsMissingOrOffTheScale(string? @base, string? flyer, string code)
    {
        ProposedTransition.Create(name: null, @base, flyer, description: null).Error!.Code.ShouldBe(code);
    }

    /// <summary>Checked in the order of the form: name, then difficulties, then description.</summary>
    [Fact]
    public void Create_Should_ReportTheNameFirst_When_SeveralValuesAreInvalid()
    {
        ProposedTransition.Create("---", null, null, new string('x', TransitionDescription.MaxLength + 1)).Error
            .ShouldBe(TransitionContentErrors.NameWithoutLetterOrDigit);
        ProposedTransition.Create(null, null, "beginner", new string('x', TransitionDescription.MaxLength + 1)).Error
            .ShouldBe(PoseContentErrors.BaseDifficultyRequired);
        ProposedTransition.Create(null, "beginner", "beginner", new string('x', TransitionDescription.MaxLength + 1)).Error
            .ShouldBe(TransitionContentErrors.DescriptionTooLong);
    }
}
