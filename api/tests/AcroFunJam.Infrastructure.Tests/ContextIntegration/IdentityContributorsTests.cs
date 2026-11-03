using AcroFunJam.Application.Common;
using AcroFunJam.Application.Identity.GetMyAccount;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.ContextIntegration;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

public sealed class IdentityContributorsTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>Fake of the Identity query: the current role of each known account.</summary>
    private sealed class FakeMyAccount(Dictionary<Guid, Role> roles) : IQueryHandler<GetMyAccount, MyAccountDto>
    {
        public Task<Result<MyAccountDto>> Handle(GetMyAccount query, CancellationToken ct) =>
            Task.FromResult(roles.TryGetValue(query.AccountId.Value, out var role)
                ? Result<MyAccountDto>.Success(new MyAccountDto(EmailAddress.Create("someone@example.org").Value!, role))
                : IdentityErrors.AccountNotFound);
    }

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
