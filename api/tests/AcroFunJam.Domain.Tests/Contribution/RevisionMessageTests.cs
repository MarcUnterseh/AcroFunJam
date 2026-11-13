using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>The optional message of a contributor that explains a revision to the validator (story 6, decision B).</summary>
public sealed class RevisionMessageTests
{
    [Fact]
    public void Create_Should_RemoveTheSuperfluousSpaces_When_TheMessageHasSome()
    {
        RevisionMessage.Create("  Descente \n  dangereuse.  ").Value!.Value.ShouldBe("Descente dangereuse.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void Create_Should_GiveNoMessage_When_TheMessageIsAbsentOrOnlySpaces(string? raw)
    {
        var message = RevisionMessage.Create(raw);

        message.IsSuccess.ShouldBeTrue();
        message.Value.ShouldBeNull();
    }

    [Fact]
    public void Create_Should_Succeed_When_TheMessageHasTheMaximumLength()
    {
        RevisionMessage.Create(new string('x', RevisionMessage.MaxLength)).IsSuccess.ShouldBeTrue();
    }

    [Fact]
    public void Create_Should_FailWithRevisionMessageTooLong_When_TheMessageIsLongerThanTheMaximumLength()
    {
        RevisionMessage.Create(new string('x', 501)).Error.ShouldBe(ContributionErrors.RevisionMessageTooLong);
    }
}
