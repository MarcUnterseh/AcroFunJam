using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

/// <summary>The alternative text of a photo (story 10, R7): mandatory, without superfluous spaces, 200 characters at most.</summary>
public sealed class AltTextTests
{
    [Fact]
    public void Create_Should_KeepTheTextAsTyped_When_ItIsValid()
    {
        AltText.Create("Bird : la base, allongée sur le dos, a les pieds sur les hanches du flyer.").Value!.Value
            .ShouldBe("Bird : la base, allongée sur le dos, a les pieds sur les hanches du flyer.");
    }

    [Fact]
    public void Create_Should_RemoveSuperfluousSpaces_When_TheTextHasSome()
    {
        AltText.Create("  Bird   vue de profil \n ").Value!.Value.ShouldBe("Bird vue de profil");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("    ")]
    public void Create_Should_FailWithAltTextRequired_When_TheTextIsMissingOrOnlySpaces(string? raw)
    {
        AltText.Create(raw).Error.ShouldBe(PhotoContentErrors.AltTextRequired);
    }

    [Fact]
    public void Create_Should_AcceptTheText_When_ItHasTheMaximumLength()
    {
        AltText.MaxLength.ShouldBe(200);
        AltText.Create(new string('a', AltText.MaxLength)).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void Create_Should_FailWithAltTextTooLong_When_TheTextIsLongerThanTheMaximum()
    {
        AltText.Create(new string('a', AltText.MaxLength + 1)).Error.ShouldBe(PhotoContentErrors.AltTextTooLong);
    }

    [Fact]
    public void Create_Should_CountCharacters_When_TheTextHasDecomposedAccents()
    {
        AltText.Create(string.Concat(Enumerable.Repeat("é", AltText.MaxLength))).IsSuccess.ShouldBeTrue();
    }
}
