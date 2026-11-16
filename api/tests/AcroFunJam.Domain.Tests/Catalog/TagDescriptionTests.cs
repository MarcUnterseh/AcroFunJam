using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Catalog;

/// <summary>The short description of a tag (story 8, L7, Q129, Q144, Q153, ADR 0032): mandatory, 200 characters at most.</summary>
public sealed class TagDescriptionTests
{
    [Fact]
    public void Create_Should_KeepTheDescription_When_ItIsValid()
    {
        TagDescription.Create("Le flyer passe la tête en bas pendant la transition.").Value!.Value
            .ShouldBe("Le flyer passe la tête en bas pendant la transition.");
    }

    [Fact]
    public void Create_Should_RemoveSuperfluousSpaces_When_TheDescriptionHasSome()
    {
        TagDescription.Create("   Le flyer passe   la tête en bas\npendant la transition.  ").Value!.Value
            .ShouldBe("Le flyer passe la tête en bas pendant la transition.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("    ")]
    public void Create_Should_FailWithDescriptionRequired_When_TheDescriptionIsMissingOrOnlySpaces(string? raw)
    {
        TagDescription.Create(raw).Error.ShouldBe(TagContentErrors.DescriptionRequired);
    }

    [Fact]
    public void Create_Should_AcceptTheDescription_When_ItHasTheMaximumLength()
    {
        TagDescription.Create(new string('d', TagDescription.MaxLength)).IsSuccess.ShouldBeTrue();
        TagDescription.MaxLength.ShouldBe(200);
    }

    [Fact]
    public void Create_Should_FailWithDescriptionTooLong_When_TheDescriptionIsLongerThanTheMaximum()
    {
        TagDescription.Create(new string('d', TagDescription.MaxLength + 1)).Error.ShouldBe(TagContentErrors.DescriptionTooLong);
    }
}
