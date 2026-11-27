using AcroFunJam.Domain.Catalog;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Tests.Catalog;

/// <summary>
/// The confirmation of the rights on a photo (story 10, R9, Q253): mandatory at each addition, kept with who gave it and when,
/// never shown.
/// </summary>
public sealed class RightsConfirmationTests
{
    private static readonly CatalogManagerId Bruno = new(Guid.Parse("0b000000-0000-0000-0000-000000000001"));
    private static readonly DateTimeOffset On21November = new(2026, 11, 21, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void ForPhoto_Should_KeepWhoConfirmedAndWhen_When_TheBoxIsTicked()
    {
        var confirmation = RightsConfirmation.ForPhoto(true, Bruno, On21November).Value!;

        confirmation.ConfirmedBy.ShouldBe(Bruno);
        confirmation.ConfirmedAt.ShouldBe(On21November);
    }

    [Fact]
    public void ForPhoto_Should_FailWithRightsConfirmationRequired_When_TheBoxIsNotTicked()
    {
        RightsConfirmation.ForPhoto(false, Bruno, On21November).Error.ShouldBe(PhotoContentErrors.RightsConfirmationRequired);
    }
}
