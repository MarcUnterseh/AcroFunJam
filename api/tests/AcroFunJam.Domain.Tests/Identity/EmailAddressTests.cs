using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Domain.Tests.Identity;

public sealed class EmailAddressTests
{
    private static EmailAddress Email(string raw) => EmailAddress.Create(raw).Value!;

    [Fact]
    public void Equals_Should_ReturnTrue_When_OnlyTheCaseDiffers()
    {
        Email("Alice@Example.org").ShouldBe(Email("alice@example.org"));
        Email("Alice@Example.org").GetHashCode().ShouldBe(Email("alice@example.org").GetHashCode());
    }

    [Fact]
    public void Equals_Should_ReturnFalse_When_TheAddressesDiffer()
    {
        Email("alice@example.org").ShouldNotBe(Email("bruno@example.org"));
    }

    [Fact]
    public void Create_Should_TrimTheAddress_When_ItIsSurroundedBySpaces()
    {
        Email("  alice@example.org ").Value.ShouldBe("alice@example.org");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("alice")]
    public void Create_Should_Fail_When_TheAddressIsMissingOrInvalid(string? raw)
    {
        EmailAddress.Create(raw).Error.ShouldBe(IdentityErrors.InvalidEmail);
    }
}
