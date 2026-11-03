using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

/// <summary>Catalog order: the comparison key in ordinal order, then the exact name (ADR 0017).</summary>
public sealed class PoseNameCatalogOrderTests
{
    private static int Compare(string left, string right) =>
        PoseName.CatalogOrder.Compare(PoseName.Create(left).Value!, PoseName.Create(right).Value!);

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
    public void Compare_Should_CountHyphensAsSpaces_When_NamesContainHyphens()
    {
        // Revises story 1, where hyphens were removed: "hand to hand" < "handstand" (a space sorts before letters).
        Compare("Hand-to-Hand", "Handstand").ShouldBeLessThan(0);
    }

    [Fact]
    public void Compare_Should_IgnoreAccents_When_ANameIsAccented()
    {
        Compare("Bird", "Étoile").ShouldBeLessThan(0);
        Compare("Étoile", "Folded Leaf").ShouldBeLessThan(0);
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
