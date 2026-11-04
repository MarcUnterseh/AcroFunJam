using AcroFunJam.Domain.Contribution;
using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.ContextIntegration;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

public sealed class IdentityValidatorsTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Theory]
    [InlineData("user", false)]
    [InlineData("validator", true)]
    [InlineData("administrator", true)]
    public async Task Find_Should_TellWhetherTheAccountCanDecide_When_ItIsUserValidatorOrAdministrator(string role, bool canDecide)
    {
        var id = Guid.NewGuid();
        var validators = new IdentityValidators(new FakeMyAccount(new() { [id] = Role.FromCode(role).Value! }));

        var validator = await validators.Find(new ValidatorId(id), Ct);

        validator.ShouldBe(new Validator(new ValidatorId(id), canDecide));
    }

    [Fact]
    public async Task Find_Should_ReturnNull_When_TheAccountNoLongerExists()
    {
        var validators = new IdentityValidators(new FakeMyAccount([]));

        (await validators.Find(new ValidatorId(Guid.NewGuid()), Ct)).ShouldBeNull();
    }
}
