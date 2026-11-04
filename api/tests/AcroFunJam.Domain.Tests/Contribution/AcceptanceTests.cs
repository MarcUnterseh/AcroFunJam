using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>An acceptance protects its own coherence, wherever it is built from (ADR 0022).</summary>
public sealed class AcceptanceTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 4, 10, 0, 0, TimeSpan.Zero);
    private static readonly ValidatorId Claire = new(Guid.NewGuid());
    private static readonly ProposedPose Throne = AProposedPose.Named("Throne");

    [Fact]
    public void Of_Should_FailWithAdjustmentNoteWithoutAdjustment_When_ANoteAccompaniesAnAcceptanceWithoutAdjustment()
    {
        var note = AdjustmentNote.Create("Belle proposition.").Value;

        var acceptance = Acceptance.Of(Throne, Throne.Retain(PoseAdjustments.None), note, Claire, Now);

        acceptance.Error.ShouldBe(ContributionErrors.AdjustmentNoteWithoutAdjustment);
    }
}
