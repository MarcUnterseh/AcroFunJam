using AcroFunJam.Application.Identity.AssignRole;
using AcroFunJam.Application.Identity.BootstrapInitialAdministrator;
using AcroFunJam.Application.Identity.RevokeRole;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Tests.Identity;

public sealed class RoleChangeHandlerTests
{
    private static readonly TimeProvider Clock = new FixedTimeProvider(new DateTimeOffset(2026, 11, 2, 18, 0, 0, TimeSpan.Zero));
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private static readonly AccountId Paul = new(Guid.NewGuid());

    [Fact]
    public async Task AssignRole_Should_SaveTheAccountWithItsNewRole_When_TheAccountExists()
    {
        var bruno = AnAccount.With("bruno@example.org", Role.User);
        var accounts = new FakeAccountRepository(bruno, AnAccount.With("paul@example.org", Role.Administrator));

        var result = await new AssignRoleHandler(accounts, Clock)
            .Handle(new AssignRole(EmailAddress.Create("Bruno@Example.org").Value!, Role.Validator, By: Paul), Ct);

        result.IsSuccess.ShouldBeTrue();
        accounts.Saved.ShouldHaveSingleItem().Role.ShouldBe(Role.Validator);
    }

    [Fact]
    public async Task AssignRole_Should_SaveNothing_When_TheRoleIsAlreadyHeld()
    {
        var bruno = AnAccount.With("bruno@example.org", Role.Validator);
        var accounts = new FakeAccountRepository(bruno);

        var result = await new AssignRoleHandler(accounts, Clock).Handle(new AssignRole(bruno.Email, Role.Validator, By: Paul), Ct);

        result.IsSuccess.ShouldBeTrue();
        accounts.Saved.ShouldBeEmpty();
    }

    [Fact]
    public async Task AssignRole_Should_Fail_When_NoAccountHasTheEmail()
    {
        var accounts = new FakeAccountRepository();

        var result = await new AssignRoleHandler(accounts, Clock)
            .Handle(new AssignRole(EmailAddress.Create("chloe@example.org").Value!, Role.Validator, By: Paul), Ct);

        result.Error.ShouldBe(IdentityErrors.AccountNotFound);
        accounts.Saved.ShouldBeEmpty();
    }

    [Fact]
    public async Task AssignRole_Should_PassTheNumberOfAdministrators_When_DemotingAnAdministrator()
    {
        var paul = AnAccount.With("paul@example.org", Role.Administrator);
        var accounts = new FakeAccountRepository(paul);

        var result = await new AssignRoleHandler(accounts, Clock)
            .Handle(new AssignRole(paul.Email, Role.Validator, By: Paul), Ct);

        result.Error.ShouldBe(IdentityErrors.LastAdministrator);
        accounts.Saved.ShouldBeEmpty();
    }

    [Fact]
    public async Task RevokeRole_Should_SaveTheAccountBackToUser_When_TheRoleIsHeld()
    {
        var bruno = AnAccount.With("bruno@example.org", Role.Validator);
        var accounts = new FakeAccountRepository(bruno);

        var result = await new RevokeRoleHandler(accounts, Clock).Handle(new RevokeRole(bruno.Email, Role.Validator, By: Paul), Ct);

        result.IsSuccess.ShouldBeTrue();
        accounts.Saved.ShouldHaveSingleItem().Role.ShouldBe(Role.User);
    }

    [Fact]
    public async Task RevokeRole_Should_Fail_When_NoAccountHasTheEmail()
    {
        var result = await new RevokeRoleHandler(new FakeAccountRepository(), Clock)
            .Handle(new RevokeRole(EmailAddress.Create("chloe@example.org").Value!, Role.Validator, By: Paul), Ct);

        result.Error.ShouldBe(IdentityErrors.AccountNotFound);
    }

    [Fact]
    public async Task Bootstrap_Should_PromoteTheDesignatedAccount_When_NoAdministratorExists()
    {
        var marc = AnAccount.With("marc@example.org", Role.User);
        var accounts = new FakeAccountRepository(marc);

        await new BootstrapInitialAdministratorHandler(accounts, Clock)
            .Handle(new BootstrapInitialAdministrator(EmailAddress.Create("marc@example.org").Value!), Ct);

        accounts.Saved.ShouldHaveSingleItem().Role.ShouldBe(Role.Administrator);
    }

    [Fact]
    public async Task Bootstrap_Should_DoNothing_When_NoAddressIsDesignated()
    {
        var accounts = new FakeAccountRepository(AnAccount.With("marc@example.org", Role.User));

        var result = await new BootstrapInitialAdministratorHandler(accounts, Clock)
            .Handle(new BootstrapInitialAdministrator(null), Ct);

        result.IsSuccess.ShouldBeTrue();
        accounts.Saved.ShouldBeEmpty();
    }

    [Fact]
    public async Task Bootstrap_Should_DoNothing_When_TheDesignatedAccountDoesNotExistYet()
    {
        var accounts = new FakeAccountRepository();

        var result = await new BootstrapInitialAdministratorHandler(accounts, Clock)
            .Handle(new BootstrapInitialAdministrator(EmailAddress.Create("marc@example.org").Value!), Ct);

        result.IsSuccess.ShouldBeTrue();
        accounts.Saved.ShouldBeEmpty();
    }

    [Fact]
    public async Task Bootstrap_Should_DoNothing_When_AnAdministratorAlreadyExists()
    {
        var marc = AnAccount.With("marc@example.org", Role.User);
        var accounts = new FakeAccountRepository(marc, AnAccount.With("paul@example.org", Role.Administrator));

        await new BootstrapInitialAdministratorHandler(accounts, Clock)
            .Handle(new BootstrapInitialAdministrator(marc.Email), Ct);

        accounts.Saved.ShouldBeEmpty();
        marc.Role.ShouldBe(Role.User);
    }
}
