using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

/// <summary>The optional name of a transition (story 7, R8, ADR 0028): the rules of a pose name, but absent is allowed.</summary>
public sealed class TransitionNameTests
{
    [Fact]
    public void CreateOptional_Should_KeepTheName_When_ItIsValid()
    {
        TransitionName.CreateOptional("Ninja Star").Value!.Value.ShouldBe("Ninja Star");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void CreateOptional_Should_GiveNoName_When_TheNameIsMissingOrOnlySpaces(string? raw)
    {
        var name = TransitionName.CreateOptional(raw);

        name.IsSuccess.ShouldBeTrue();
        name.Value.ShouldBeNull();
    }

    [Fact]
    public void CreateOptional_Should_RemoveSuperfluousSpaces_When_TheNameHasSome()
    {
        TransitionName.CreateOptional("  Ninja    Star ").Value!.Value.ShouldBe("Ninja Star");
    }

    [Fact]
    public void CreateOptional_Should_AcceptTheName_When_ItHasTheMaximumLength()
    {
        TransitionName.CreateOptional(new string('x', TransitionName.MaxLength)).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void CreateOptional_Should_FailWithNameTooLong_When_TheNameIsLongerThanTheMaximum()
    {
        TransitionName.CreateOptional(new string('x', TransitionName.MaxLength + 1)).Error.ShouldBe(TransitionContentErrors.NameTooLong);
    }

    /// <summary>Q107: a name made only of punctuation is refused, not read as « no name ».</summary>
    [Fact]
    public void CreateOptional_Should_FailWithNameWithoutLetterOrDigit_When_TheNameIsOnlyPunctuation()
    {
        TransitionName.CreateOptional("---").Error.ShouldBe(TransitionContentErrors.NameWithoutLetterOrDigit);
    }

    [Fact]
    public void Key_Should_BeTheSame_When_TwoNamesDifferOnlyByCaseAccentsOrHyphens()
    {
        TransitionName.CreateOptional("ninja-star").Value!.Key.ShouldBe(TransitionName.CreateOptional("NINJA STAR").Value!.Key);
        TransitionName.CreateOptional("Étoile").Value!.Key.ShouldBe(TransitionName.CreateOptional("etoile").Value!.Key);
    }

    [Fact]
    public void Key_Should_Differ_When_TheNamesDiffer()
    {
        TransitionName.CreateOptional("Ninja Star").Value!.Key.ShouldNotBe(TransitionName.CreateOptional("Catherine's Wheel").Value!.Key);
    }
}
