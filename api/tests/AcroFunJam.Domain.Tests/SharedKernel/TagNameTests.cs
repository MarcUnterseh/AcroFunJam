using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

/// <summary>The name of a tag (story 8, L5, L6, ADR 0032): the rules of a pose name, 30 characters at most.</summary>
public sealed class TagNameTests
{
    [Fact]
    public void Create_Should_KeepTheNameAsTyped_When_ItIsValid()
    {
        TagName.Create("Inversion").Value!.Value.ShouldBe("Inversion");
    }

    [Fact]
    public void Create_Should_RemoveSuperfluousSpaces_When_TheNameHasSome()
    {
        TagName.Create("  washing    machine ").Value!.Value.ShouldBe("washing machine");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_Should_FailWithNameRequired_When_TheNameIsMissingOrOnlySpaces(string? raw)
    {
        TagName.Create(raw).Error.ShouldBe(TagContentErrors.NameRequired);
    }

    [Fact]
    public void Create_Should_FailWithNameWithoutLetterOrDigit_When_TheNameIsOnlyPunctuation()
    {
        TagName.Create("---").Error.ShouldBe(TagContentErrors.NameWithoutLetterOrDigit);
    }

    [Fact]
    public void Create_Should_AcceptTheName_When_ItHasTheMaximumLength()
    {
        TagName.Create(new string('v', TagName.MaxLength)).IsSuccess.ShouldBeTrue();
        TagName.MaxLength.ShouldBe(30);
    }

    [Fact]
    public void Create_Should_FailWithNameTooLong_When_TheNameIsLongerThanTheMaximum()
    {
        TagName.Create(new string('v', TagName.MaxLength + 1)).Error.ShouldBe(TagContentErrors.NameTooLong);
    }

    [Fact]
    public void Create_Should_CountCharacters_When_TheNameHasDecomposedAccents()
    {
        // "é" typed as "e" + combining accent counts as one character (NFC).
        TagName.Create(new string('v', TagName.MaxLength - 1) + "é").IsSuccess.ShouldBeTrue();
    }

    [Theory]
    [InlineData("pop", "POP")]
    [InlineData("vrille", "vrillé")]
    [InlineData("inversion", "inversion !")]
    public void Key_Should_BeTheSame_When_TwoNamesDifferOnlyByCaseAccentsOrPunctuation(string left, string right)
    {
        TagName.Create(left).Value!.Key.ShouldBe(TagName.Create(right).Value!.Key);
    }

    [Fact]
    public void Key_Should_BeTheTagNameKeyOfTheName_When_Computed()
    {
        var name = TagName.Create("Pop").Value!;

        name.Key.ShouldBe(TagNameKey.From(name));
        name.Key.Value.ShouldBe("pop");
    }

    [Fact]
    public void Key_Should_Differ_When_TheNamesDiffer()
    {
        TagName.Create("pop").Value!.Key.ShouldNotBe(TagName.Create("whip").Value!.Key);
    }

    private static int Compare(string left, string right) =>
        TagName.CatalogOrder.Compare(TagName.Create(left).Value!, TagName.Create(right).Value!);

    [Fact]
    public void CatalogOrder_Should_IgnoreTheCase_When_OrderingTags()
    {
        // Ordinal comparison would put "Inversion" (uppercase I) before "dynamique".
        Compare("dynamique", "Inversion").ShouldBeLessThan(0);
        Compare("Inversion", "whip").ShouldBeLessThan(0);
    }

    [Fact]
    public void CatalogOrder_Should_OrderByExactSpelling_When_TheKeysAreEqual()
    {
        Compare("Pop", "pop").ShouldBeLessThan(0);
        Compare("pop", "pop").ShouldBe(0);
    }
}
