using AcroFunJam.Domain.Catalog;

namespace AcroFunJam.Domain.Tests.Catalog;

public sealed class PoseNameCatalogOrderTests
{
    private static int Compare(string left, string right) =>
        PoseName.CatalogOrder.Compare(new PoseName(left), new PoseName(right));

    [Fact]
    public void Compare_Should_OrderAlphabetically_When_NamesDiffer()
    {
        Compare("Bird", "Throne").ShouldBeLessThan(0);
        Compare("Throne", "Bird").ShouldBeGreaterThan(0);
    }

    [Fact]
    public void Compare_Should_IgnoreCase_When_NamesDifferOnlyByCase()
    {
        // Ordinal comparison would put "Folded Leaf" (uppercase F) before "bird".
        Compare("bird", "Folded Leaf").ShouldBeLessThan(0);
    }

    [Fact]
    public void Compare_Should_IgnoreHyphens_When_NamesContainHyphens()
    {
        // With the hyphen, "Hand-to-Hand" < "Handstand" ('-' sorts before 's'); without it, "handtohand" > "handstand".
        Compare("Handstand", "Hand-to-Hand").ShouldBeLessThan(0);
    }

    [Fact]
    public void Compare_Should_BeDeterministic_When_NamesAreEquivalent()
    {
        Compare("Bird", "bird").ShouldNotBe(0);
        Compare("Bird", "bird").ShouldBe(-Compare("bird", "Bird"));
    }

    [Fact]
    public void Compare_Should_ReturnZero_When_NamesAreIdentical()
    {
        Compare("Star", "Star").ShouldBe(0);
    }
}
