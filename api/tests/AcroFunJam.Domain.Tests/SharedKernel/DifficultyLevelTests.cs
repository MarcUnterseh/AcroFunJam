using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

public sealed class DifficultyLevelTests
{
    [Theory]
    [InlineData("discovery", DifficultyLevel.Discovery)]
    [InlineData("beginner", DifficultyLevel.Beginner)]
    [InlineData("intermediate", DifficultyLevel.Intermediate)]
    [InlineData("advanced", DifficultyLevel.Advanced)]
    public void ToCode_Should_GiveBackTheCode_When_TheLevelWasReadFromIt(string code, DifficultyLevel level)
    {
        DifficultyLevel.FromCode(code).Value.ShouldBe(level);
        level.ToCode().ShouldBe(code);
    }

    [Fact]
    public void FromCode_Should_FailNamingTheValue_When_TheLevelIsNotOnTheScale()
    {
        var error = DifficultyLevel.FromCode("expert").Error.ShouldNotBeNull();

        error.Code.ShouldBe("pose.unknown-difficulty-level");
        error.Message.ShouldContain("\"expert\"");
    }

    [Fact]
    public void FromCode_Should_TruncateTheQuotedValue_When_ItIsLong()
    {
        var error = DifficultyLevel.FromCode(new string('x', 1000)).Error.ShouldNotBeNull();

        error.Message.ShouldContain($"\"{new string('x', 30)}…\"");
        error.Message.Length.ShouldBeLessThan(80);
    }
}
