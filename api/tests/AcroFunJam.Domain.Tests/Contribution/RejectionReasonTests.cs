using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

public sealed class RejectionReasonTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Create_Should_FailWithRejectionReasonRequired_When_TheReasonIsMissing(string? raw)
    {
        RejectionReason.Create(raw).Error.ShouldBe(ContributionErrors.RejectionReasonRequired);
    }

    [Theory]
    [InlineData(" ")]
    [InlineData("   \n\t  ")]
    public void Create_Should_FailWithRejectionReasonRequired_When_TheReasonIsOnlySpaces(string raw)
    {
        RejectionReason.Create(raw).Error.ShouldBe(ContributionErrors.RejectionReasonRequired);
    }

    [Fact]
    public void Create_Should_RemoveSuperfluousSpaces_When_TheReasonHasLeadingTrailingOrRepeatedSpaces()
    {
        var reason = RejectionReason.Create("  Doublon   de\nHigh Bird.\t ");

        reason.Value.ShouldNotBeNull().Value.ShouldBe("Doublon de High Bird.");
    }

    [Fact]
    public void Create_Should_Succeed_When_TheReasonHas500Characters()
    {
        var fiveHundred = "Doublon " + new string('x', 492);

        RejectionReason.Create(fiveHundred).Value.ShouldNotBeNull().Value.Length.ShouldBe(RejectionReason.MaxLength);
        RejectionReason.MaxLength.ShouldBe(500);
    }

    [Fact]
    public void Create_Should_FailWithRejectionReasonTooLong_When_TheReasonHas501Characters()
    {
        var fiveHundredAndOne = "Doublon " + new string('x', 493);

        RejectionReason.Create(fiveHundredAndOne).Error.ShouldBe(ContributionErrors.RejectionReasonTooLong);
    }

    [Fact]
    public void Create_Should_MeasureTheLengthAfterNormalisation_When_SpacesSurroundA500CharacterReason()
    {
        var surrounded = "   Doublon   " + new string('x', 492) + "  \n ";

        RejectionReason.Create(surrounded).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void Create_Should_CountCodePoints_When_TheReasonHasCharactersOutsideTheBasicPlane()
    {
        // 500 code points, but 992 UTF-16 units: counted as PostgreSQL char_length and the site do.
        var fiveHundredEmojis = "Doublon " + string.Concat(Enumerable.Repeat("🤸", 492));

        RejectionReason.Create(fiveHundredEmojis).IsSuccess.ShouldBeTrue();
    }
}
