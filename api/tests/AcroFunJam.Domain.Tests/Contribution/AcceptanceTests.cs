using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>An acceptance protects its own coherence, wherever it is built from (ADR 0022).</summary>
public sealed class AcceptanceTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 4, 10, 0, 0, TimeSpan.Zero);
    private static readonly ValidatorId Claire = new(Guid.NewGuid());
    private static readonly ContributorId Bruno = new(Guid.NewGuid());
    private static readonly ProposedPose Throne = AProposedPose.Named("Throne");

    [Fact]
    public void Of_Should_FailWithAdjustmentNoteWithoutAdjustment_When_ANoteAccompaniesAnAcceptanceWithoutAdjustment()
    {
        var note = AdjustmentNote.Create("Belle proposition.").Value;

        var acceptance = Acceptance.Of(Throne, Throne.Retain(PoseAdjustments.None), note, Claire, Now);

        acceptance.Error.ShouldBe(ContributionErrors.AdjustmentNoteWithoutAdjustment);
    }

    [Fact]
    public void DirectPublication_Should_RetainTheProposedPoseWithoutNote_When_Created()
    {
        var acceptance = Acceptance.DirectPublication(Throne, Bruno, Now);

        acceptance.ShouldSatisfyAllConditions(
            () => acceptance.Retained.ShouldBe(Throne.Retain(PoseAdjustments.None)),
            () => acceptance.HasAdjustments.ShouldBeFalse(),
            () => acceptance.Note.ShouldBeNull());
    }

    [Fact]
    public void DirectPublication_Should_BeDecidedByTheContributorAtTheGivenInstant_When_Created()
    {
        var acceptance = Acceptance.DirectPublication(Throne, Bruno, Now);

        acceptance.ShouldSatisfyAllConditions(
            () => acceptance.By.ShouldBe(Bruno.AsValidator()),
            () => acceptance.At.ShouldBe(Now));
    }

    [Fact]
    public void DirectPublication_Should_BeMarkedAsDirectPublication_When_Created()
    {
        var acceptance = Acceptance.DirectPublication(Throne, Bruno, Now);

        acceptance.IsDirectPublication.ShouldBeTrue();
    }

    /// <summary>Even the contributor promoted since (story 4, R17), accepting at the very instant of the submission.</summary>
    [Fact]
    public void Of_Should_NotBeADirectPublication_When_AValidatorAccepts()
    {
        var acceptance = Acceptance.Of(Throne, Throne.Retain(PoseAdjustments.None), note: null, Bruno.AsValidator(), Now).Value!;

        acceptance.IsDirectPublication.ShouldBeFalse();
    }

    /// <summary>Read back from storage as recorded: the coherence of a direct publication is checked by the rehydration.</summary>
    [Fact]
    public void Restore_Should_BeTheDirectPublication_When_RecordedAsSuch()
    {
        var restored = Acceptance.Restore(Throne, Throne.Retain(PoseAdjustments.None), note: null, Bruno.AsValidator(), Now, isDirectPublication: true);

        restored.Value.ShouldBe(Acceptance.DirectPublication(Throne, Bruno, Now));
    }

    [Fact]
    public void Restore_Should_NotBeADirectPublication_When_RecordedAsAnOrdinaryAcceptance()
    {
        var retained = Throne.Retain(PoseAdjustments.None);

        var restored = Acceptance.Restore(Throne, retained, note: null, Claire, Now, isDirectPublication: false);

        restored.Value.ShouldBe(Acceptance.Of(Throne, retained, note: null, Claire, Now).Value);
    }

    [Fact]
    public void Restore_Should_FailWithAdjustmentNoteWithoutAdjustment_When_ANoteAccompaniesAnAcceptanceWithoutAdjustment()
    {
        var note = AdjustmentNote.Create("Belle proposition.").Value;

        var restored = Acceptance.Restore(Throne, Throne.Retain(PoseAdjustments.None), note, Claire, Now, isDirectPublication: false);

        restored.Error.ShouldBe(ContributionErrors.AdjustmentNoteWithoutAdjustment);
    }
}
