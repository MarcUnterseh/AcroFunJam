using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.ContextIntegration;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

public sealed class IdentityContributorsTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Theory]
    [InlineData("user", false)]
    [InlineData("validator", true)]
    [InlineData("administrator", true)]
    public async Task Find_Should_TellWhetherTheContributorIsAValidator_When_TheAccountExists(string role, bool isValidator)
    {
        var id = Guid.NewGuid();
        var contributors = new IdentityContributors(new FakeMyAccount(new() { [id] = Role.FromCode(role).Value! }));

        var contributor = await contributors.Find(new ContributorId(id), Ct);

        contributor.ShouldBe(new Contributor(new ContributorId(id), isValidator));
    }

    [Fact]
    public async Task Find_Should_ReturnNull_When_TheAccountNoLongerExists()
    {
        var contributors = new IdentityContributors(new FakeMyAccount([]));

        (await contributors.Find(new ContributorId(Guid.NewGuid()), Ct)).ShouldBeNull();
    }
}
