using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>The optional message of a validator that accompanies an acceptance with adjustments (ADR 0022).</summary>
public sealed class AdjustmentNoteTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   \n\t  ")]
    public void Create_Should_ReturnNoNote_When_TheMessageIsMissingOrOnlySpaces(string? raw)
    {
        var note = AdjustmentNote.Create(raw);

        note.IsSuccess.ShouldBeTrue();
        note.Value.ShouldBeNull();
    }

    [Fact]
    public void Create_Should_RemoveSuperfluousSpaces_When_TheMessageHasRepeatedSpaces()
    {
        var note = AdjustmentNote.Create("  Descente   dangereuse.\n ");

        note.Value.ShouldNotBeNull().Value.ShouldBe("Descente dangereuse.");
    }

    [Fact]
    public void Create_Should_FailWithAdjustmentNoteTooLong_When_TheMessageHas501Characters()
    {
        var fiveHundred = "Corrigé " + new string('x', 492);

        AdjustmentNote.MaxLength.ShouldBe(500);
        AdjustmentNote.Create(fiveHundred).Value.ShouldNotBeNull().Value.ShouldBe(fiveHundred);
        AdjustmentNote.Create(fiveHundred + "x").Error.ShouldBe(ContributionErrors.AdjustmentNoteTooLong);
    }
}
