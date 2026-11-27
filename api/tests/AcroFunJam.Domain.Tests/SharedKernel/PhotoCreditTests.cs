using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

/// <summary>
/// The credit of a photo (story 10, R8, Q252): the author of the photo, mandatory, 100 characters at most, a pseudonym or a
/// collective accepted, never a stand-in for an unknown author (compared by its whole key). The rule is CreditText, shared with
/// the credit of a video (story 12).
/// </summary>
public sealed class PhotoCreditTests
{
    [Theory]
    [InlineData("Léa Martin")]
    [InlineData("Lulu Acro")]
    [InlineData("Collectif AcroLyon")]
    [InlineData("Collectif Inconnu Acro")]
    public void Create_Should_AcceptTheCredit_When_ItNamesAnAuthor(string raw)
    {
        PhotoCredit.Create(raw).Value!.Value.ShouldBe(raw);
    }

    [Fact]
    public void Create_Should_RemoveSuperfluousSpaces_When_TheCreditHasSome()
    {
        PhotoCredit.Create("  Léa   Martin ").Value!.Value.ShouldBe("Léa Martin");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("?")]
    [InlineData("- -")]
    public void Create_Should_FailWithCreditRequired_When_TheCreditIsMissingOrHasNoLetterOrDigit(string? raw)
    {
        PhotoCredit.Create(raw).Error.ShouldBe(PhotoContentErrors.CreditRequired);
    }

    [Theory]
    [InlineData("inconnu")]
    [InlineData("Inconnu")]
    [InlineData("INCONNUE")]
    [InlineData("Auteur inconnu")]
    [InlineData("auteure inconnue")]
    [InlineData("Autrice inconnue")]
    [InlineData("photographe inconnu")]
    [InlineData("Photographe inconnue")]
    [InlineData("Anonyme")]
    [InlineData("unknown")]
    [InlineData("Anonymous")]
    [InlineData("  Auteur   Inconnu. ")]
    [InlineData("auteur-inconnu")]
    public void Create_Should_FailWithCreditNotAnAuthor_When_TheCreditStandsInForAnUnknownAuthor(string raw)
    {
        PhotoCredit.Create(raw).Error.ShouldBe(PhotoContentErrors.CreditNotAnAuthor);
    }

    [Fact]
    public void Create_Should_AcceptTheCredit_When_ItHasTheMaximumLength()
    {
        PhotoCredit.MaxLength.ShouldBe(100);
        PhotoCredit.Create(new string('l', PhotoCredit.MaxLength)).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void Create_Should_FailWithCreditTooLong_When_TheCreditIsLongerThanTheMaximum()
    {
        PhotoCredit.Create(new string('l', PhotoCredit.MaxLength + 1)).Error.ShouldBe(PhotoContentErrors.CreditTooLong);
    }
}
