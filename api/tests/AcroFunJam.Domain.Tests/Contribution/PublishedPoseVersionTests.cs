using AcroFunJam.Domain.Contribution;

namespace AcroFunJam.Domain.Tests.Contribution;

/// <summary>The version a revision starts from, as sent by the website (ADR 0024).</summary>
public sealed class PublishedPoseVersionTests
{
    [Fact]
    public void Create_Should_KeepTheVersion_When_ItIsOneOrMore()
    {
        PublishedPoseVersion.Create(3).Value.ShouldBe(new PublishedPoseVersion(3));
    }

    [Theory]
    [InlineData(null)]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_Should_FailWithPoseVersionRequired_When_TheVersionIsAbsentOrBelowOne(int? version)
    {
        PublishedPoseVersion.Create(version).Error.ShouldBe(ContributionErrors.PoseVersionRequired);
    }
}
