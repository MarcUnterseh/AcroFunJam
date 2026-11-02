using AcroFunJam.Application.Identity.GetMyAccount;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Tests.Identity;

public sealed class GetMyAccountHandlerTests
{
    [Fact]
    public async Task Handle_Should_ReturnEmailAndRole_When_AccountExists()
    {
        var alice = Account.Rehydrate(new AccountId(Guid.NewGuid()), EmailAddress.Create("alice@example.org").Value!, Role.User);
        var handler = new GetMyAccountHandler(new FakeAccountRepository(alice));

        var result = await handler.Handle(new GetMyAccount(alice.Id), TestContext.Current.CancellationToken);

        result.IsSuccess.ShouldBeTrue();
        result.Value.ShouldNotBeNull();
        result.Value.Email.ShouldBe(EmailAddress.Create("alice@example.org").Value!);
        result.Value.Role.ShouldBe(Role.User);
    }
}
