using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

public sealed class PoseNameTests
{
    [Fact]
    public void Create_Should_KeepTheName_When_ItIsValid()
    {
        var name = PoseName.Create("Throne");

        name.IsSuccess.ShouldBeTrue();
        name.Value!.Value.ShouldBe("Throne");
    }

    [Fact]
    public void Create_Should_TrimTheName_When_ItStartsOrEndsWithSpaces()
    {
        PoseName.Create("  Folded Leaf  ").Value!.Value.ShouldBe("Folded Leaf");
    }

    [Fact]
    public void Create_Should_CollapseInnerSpaces_When_TheyAreConsecutive()
    {
        PoseName.Create("High    Bird").Value!.Value.ShouldBe("High Bird");
    }

    [Theory]
    [InlineData("Hand-to-Hand (L-base)")]
    [InlineData("reverse bird")]
    [InlineData("Free Bird")]
    [InlineData("Étoile")]
    public void Create_Should_KeepTheNameAsTyped_When_ItHasCaseHyphensParenthesesOrAccents(string raw)
    {
        PoseName.Create(raw).Value!.Value.ShouldBe(raw);
    }

    [Fact]
    public void Create_Should_ComposeTheAccents_When_TheyAreTypedDecomposed()
    {
        PoseName.Create("Étoile").Value!.Value.ShouldBe("Étoile");
    }

    [Fact]
    public void Create_Should_AcceptTheName_When_ItHasTheMaximumLength()
    {
        var sixty = "Pose " + new string('x', 55);

        PoseName.Create(sixty).Value!.Value.Length.ShouldBe(PoseName.MaxLength);
        PoseName.MaxLength.ShouldBe(60);
    }

    [Fact]
    public void Create_Should_FailWithNameTooLong_When_ItExceedsTheMaximumLength()
    {
        PoseName.Create("Pose " + new string('x', 56)).Error.ShouldBe(PoseContentErrors.NameTooLong);
    }

    [Fact]
    public void Create_Should_CountTheLengthAfterRemovingSuperfluousSpaces_When_TheNameHasSome()
    {
        PoseName.Create("  Pose   " + new string('x', 55) + "  ").IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void Create_Should_CountADecomposedAccentAsOneCharacter_When_TheNameHasTheMaximumLength()
    {
        PoseName.Create("Étoile " + new string('x', 53)).IsSuccess.ShouldBeTrue(); // 60 once composed, 61 UTF-16 units typed
    }

    [Fact]
    public void Create_Should_CountCodePoints_When_TheNameHasCharactersOutsideTheBasicPlane()
    {
        // 59 letters + 1 character encoded on two UTF-16 units: 60 code points, as PostgreSQL char_length counts.
        PoseName.Create(new string('x', 59) + "\U0001D400").IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void Create_Should_AcceptTheName_When_ItsOnlyLetterIsOutsideTheBasicPlane()
    {
        // U+1D400 MATHEMATICAL BOLD CAPITAL A is a letter encoded on two UTF-16 units: the key reads code points.
        PoseName.Create("\U0001D400").IsSuccess.ShouldBeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_Should_FailWithNameRequired_When_TheNameIsMissingOrBlank(string? raw)
    {
        PoseName.Create(raw).Error.ShouldBe(PoseContentErrors.NameRequired);
    }

    [Theory]
    [InlineData("---")]
    [InlineData("( )")]
    [InlineData("&/+")]
    public void Create_Should_FailWithNameRequired_When_TheNameHasNeitherLetterNorDigit(string raw)
    {
        PoseName.Create(raw).Error.ShouldBe(PoseContentErrors.NameRequired);
    }
}
