using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

public sealed class PoseNameKeyTests
{
    private static PoseNameKey KeyOf(string name) => PoseName.Create(name).Value!.Key;

    [Fact]
    public void Key_Should_IgnoreCase_When_NamesDifferOnlyByCase()
    {
        KeyOf("HIGH BIRD").ShouldBe(KeyOf("high bird"));
        KeyOf("High Bird").Value.ShouldBe("high bird");
    }

    [Fact]
    public void Key_Should_IgnoreSuperfluousSpaces_When_NamesDifferOnlyBySpaces()
    {
        KeyOf("High  Bird").ShouldBe(KeyOf("High Bird"));
    }

    [Fact]
    public void Key_Should_IgnoreAccents_When_NamesDifferOnlyByAccents()
    {
        KeyOf("Étoile").ShouldBe(KeyOf("Etoile"));
        KeyOf("Étoile").Value.ShouldBe("etoile");
    }

    [Fact]
    public void Key_Should_CountAHyphenAsASpace_When_TheNameHasHyphens()
    {
        KeyOf("high-bird").ShouldBe(KeyOf("High Bird"));
    }

    [Theory]
    [InlineData("Hand-to-Hand L-base")]
    [InlineData("hand to hand l base")]
    public void Key_Should_CountParenthesesAsSpaces_When_TheNameHasParentheses(string sameName)
    {
        KeyOf("Hand-to-Hand (L-base)").ShouldBe(KeyOf(sameName));
        KeyOf("Hand-to-Hand (L-base)").Value.ShouldBe("hand to hand l base");
    }

    [Theory]
    [InlineData("Bird & Star", "bird star")]
    [InlineData("Bird+Star", "Bird Star")]
    [InlineData("Bird/Star", "Bird Star")]
    [InlineData("Bird's Nest", "Bird s Nest")]
    public void Key_Should_CountSymbolsAndApostrophesAsSpaces_When_TheNameHasSome(string name, string sameName)
    {
        KeyOf(name).ShouldBe(KeyOf(sameName));
    }

    [Fact]
    public void Key_Should_Differ_When_TheNamesAreVariantsOfAPose()
    {
        string[] variants = ["Bird", "High Bird", "Reverse Bird", "Free Bird"];

        variants.Select(KeyOf).Distinct().Count().ShouldBe(variants.Length);
    }
}
