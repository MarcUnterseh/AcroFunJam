using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.SharedKernel;

/// <summary>The optional, public description of a transition (story 7, R12, Q105, ADR 0028).</summary>
public sealed class TransitionDescriptionTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" \n  \t ")]
    public void CreateOptional_Should_GiveNoDescription_When_ItIsMissingOrOnlySpaces(string? raw)
    {
        var description = TransitionDescription.CreateOptional(raw);

        description.IsSuccess.ShouldBeTrue();
        description.Value.ShouldBeNull();
    }

    [Fact]
    public void CreateOptional_Should_TrimOnlyTheStartAndTheEnd_When_TheDescriptionHasInnerSpacesAndLineBreaks()
    {
        TransitionDescription.CreateOptional("  \nRotation complète,  retour en Star.\nVidéo : https://example.org \n ").Value!.Value
            .ShouldBe("Rotation complète,  retour en Star.\nVidéo : https://example.org");
    }

    [Fact]
    public void CreateOptional_Should_UseLineFeeds_When_TheDescriptionHasCarriageReturns()
    {
        TransitionDescription.CreateOptional("Passe par Throne\r\nsans s'arrêter.").Value!.Value.ShouldBe("Passe par Throne\nsans s'arrêter.");
    }

    [Fact]
    public void CreateOptional_Should_AcceptTheDescription_When_ItHasTheMaximumLength()
    {
        TransitionDescription.CreateOptional(new string('é', TransitionDescription.MaxLength)).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void CreateOptional_Should_FailWithDescriptionTooLong_When_ItIsLongerThanTheMaximum()
    {
        TransitionDescription.CreateOptional(new string('x', TransitionDescription.MaxLength + 1)).Error
            .ShouldBe(TransitionContentErrors.DescriptionTooLong);
    }
}
