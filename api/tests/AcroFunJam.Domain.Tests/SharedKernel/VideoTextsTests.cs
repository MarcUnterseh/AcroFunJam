using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

/// <summary>
/// The caption (V12), the credit (V13) and the description (V23) of a video (story 12): normalised like the texts of a photo, with
/// their own <c>video.*</c> codes (VideoContentErrors), so that a video proposed by a user (story 12b) refuses with the same codes.
/// </summary>
public sealed class VideoTextsTests
{
    [Fact]
    public void CaptionCreate_Should_RemoveSuperfluousSpaces_When_TheCaptionHasSome()
    {
        VideoCaption.Create("   Pop to Bird,   tutoriel   ").Value!.Value.ShouldBe("Pop to Bird, tutoriel");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("     ")]
    public void CaptionCreate_Should_FailWithCaptionRequired_When_TheCaptionIsMissingOrOnlySpaces(string? raw)
    {
        VideoCaption.Create(raw).Error.ShouldBe(VideoContentErrors.CaptionRequired);
    }

    [Fact]
    public void CaptionCreate_Should_AcceptTheCaption_When_ItHasTheMaximumLength()
    {
        VideoCaption.MaxLength.ShouldBe(100);
        VideoCaption.Create(new string('é', VideoCaption.MaxLength)).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void CaptionCreate_Should_FailWithCaptionTooLong_When_TheCaptionIsLongerThanTheMaximum()
    {
        VideoCaption.Create(new string('a', VideoCaption.MaxLength + 1)).Error.ShouldBe(VideoContentErrors.CaptionTooLong);
    }

    [Theory]
    [InlineData("Léa Martin")]
    [InlineData("Lulu Acro")]
    [InlineData("Léa et Hugo")]
    [InlineData("Collectif AcroLyon")]
    public void CreditCreate_Should_AcceptTheCredit_When_ItNamesWhoTheVideoBelongsTo(string raw)
    {
        VideoCredit.Create(raw).Value!.Value.ShouldBe(raw);
    }

    [Fact]
    public void CreditCreate_Should_RemoveSuperfluousSpaces_When_TheCreditHasSome()
    {
        VideoCredit.Create("  Léa   Martin ").Value!.Value.ShouldBe("Léa Martin");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("  ")]
    public void CreditCreate_Should_FailWithCreditRequired_When_TheCreditIsMissing(string? raw)
    {
        VideoCredit.Create(raw).Error.ShouldBe(VideoContentErrors.CreditRequired);
    }

    [Theory]
    [InlineData("inconnu")]
    [InlineData("Auteur inconnu")]
    [InlineData("Vidéaste inconnu")]
    [InlineData("Anonyme")]
    public void CreditCreate_Should_FailWithCreditNotAnAuthor_When_TheCreditNamesNobody(string raw)
    {
        VideoCredit.Create(raw).Error.ShouldBe(VideoContentErrors.CreditNotAnAuthor);
    }

    [Fact]
    public void CreditCreate_Should_FailWithCreditTooLong_When_TheCreditIsLongerThan100Characters()
    {
        VideoCredit.MaxLength.ShouldBe(100);
        VideoCredit.Create(new string('l', 100)).IsSuccess.ShouldBeTrue();
        VideoCredit.Create(new string('l', 101)).Error.ShouldBe(VideoContentErrors.CreditTooLong);
    }

    [Fact]
    public void CreditCreate_Should_RefuseAVideographerStandIn_When_ItIsTheCreditOfAPhotoToo()
    {
        PhotoCredit.Create("vidéaste inconnue").Error.ShouldBe(PhotoContentErrors.CreditNotAnAuthor);
    }

    [Fact]
    public void DescriptionCreate_Should_RemoveSuperfluousSpaces_When_TheDescriptionHasSome()
    {
        VideoDescription.Create("   La base pousse   les pieds du flyer.  ").Value!.Value.ShouldBe("La base pousse les pieds du flyer.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("    ")]
    public void DescriptionCreate_Should_GiveNoDescription_When_ItIsMissingOrOnlySpaces(string? raw)
    {
        var description = VideoDescription.Create(raw);

        description.IsSuccess.ShouldBeTrue();
        description.Value.ShouldBeNull();
    }

    [Fact]
    public void DescriptionCreate_Should_AcceptTheDescription_When_ItHasTheMaximumLength()
    {
        VideoDescription.MaxLength.ShouldBe(300);
        VideoDescription.Create(new string('d', 300)).Value!.Value.Length.ShouldBe(300);
    }

    [Fact]
    public void DescriptionCreate_Should_FailWithDescriptionTooLong_When_TheDescriptionIsLongerThanTheMaximum()
    {
        VideoDescription.Create(new string('d', 301)).Error.ShouldBe(VideoContentErrors.DescriptionTooLong);
    }
}
