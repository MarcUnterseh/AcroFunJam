using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Domain.Tests.Identity;

public sealed class AccountTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 2, 18, 0, 0, TimeSpan.Zero);
    private static readonly AccountId Paul = new(Guid.NewGuid());

    private static Account AnAccount(Role role) =>
        Account.Rehydrate(new AccountId(Guid.NewGuid()), EmailAddress.Create("bruno@example.org").Value!, role);

    // --- AssignRole -------------------------------------------------------------------------

    [Fact]
    public void AssignRole_Should_ChangeTheRoleAndRaiseRoleAssigned_When_TheRoleIsNew()
    {
        var bruno = AnAccount(Role.User);

        var result = bruno.AssignRole(Role.Validator, by: Paul, administrators: 1, Now);

        result.Value.ShouldBeTrue();
        bruno.Role.ShouldBe(Role.Validator);
        bruno.DomainEvents.ShouldHaveSingleItem().ShouldBe(new RoleAssigned(bruno.Id, Role.Validator, Paul, Now));
    }

    [Fact]
    public void AssignRole_Should_ChangeNothing_When_TheRoleIsAlreadyHeld()
    {
        var bruno = AnAccount(Role.Validator);

        var result = bruno.AssignRole(Role.Validator, by: Paul, administrators: 1, Now);

        result.IsSuccess.ShouldBeTrue();
        result.Value.ShouldBeFalse();
        bruno.Role.ShouldBe(Role.Validator);
        bruno.DomainEvents.ShouldBeEmpty();
    }

    [Fact]
    public void AssignRole_Should_Fail_When_AssigningTheUserRole()
    {
        var bruno = AnAccount(Role.Validator);

        bruno.AssignRole(Role.User, by: Paul, administrators: 1, Now).Error.ShouldBe(IdentityErrors.UserRoleIsImplicit);
        bruno.Role.ShouldBe(Role.Validator);
    }

    [Fact]
    public void AssignRole_Should_Demote_When_AnotherAdministratorRemains()
    {
        var bruno = AnAccount(Role.Administrator);

        bruno.AssignRole(Role.Validator, by: Paul, administrators: 2, Now).Value.ShouldBeTrue();

        bruno.Role.ShouldBe(Role.Validator);
    }

    [Fact]
    public void AssignRole_Should_Fail_When_DemotingTheLastAdministrator()
    {
        var paul = AnAccount(Role.Administrator);

        paul.AssignRole(Role.Validator, by: paul.Id, administrators: 1, Now).Error.ShouldBe(IdentityErrors.LastAdministrator);
        paul.Role.ShouldBe(Role.Administrator);
        paul.DomainEvents.ShouldBeEmpty();
    }

    // --- RevokeRole -------------------------------------------------------------------------

    [Theory]
    [InlineData("validator")]
    [InlineData("administrator")]
    public void RevokeRole_Should_ReturnToUserAndRaiseRoleRevoked_When_RevokingTheCurrentRole(string code)
    {
        var role = Role.FromCode(code).Value!;
        var bruno = AnAccount(role);

        bruno.RevokeRole(role, by: Paul, administrators: 2, Now).IsSuccess.ShouldBeTrue();

        bruno.Role.ShouldBe(Role.User);
        bruno.DomainEvents.ShouldHaveSingleItem().ShouldBe(new RoleRevoked(bruno.Id, role, Paul, Now));
    }

    [Fact]
    public void RevokeRole_Should_Fail_When_RevokingTheUserRole()
    {
        AnAccount(Role.User).RevokeRole(Role.User, by: Paul, administrators: 1, Now).Error.ShouldBe(IdentityErrors.UserRoleIsImplicit);
    }

    [Fact]
    public void RevokeRole_Should_Fail_When_RevokingValidatorFromAnAdministrator()
    {
        var bruno = AnAccount(Role.Administrator);

        bruno.RevokeRole(Role.Validator, by: Paul, administrators: 2, Now).Error.ShouldBe(IdentityErrors.AdministratorIsNotValidator);
        bruno.Role.ShouldBe(Role.Administrator);
    }

    [Fact]
    public void RevokeRole_Should_Fail_When_TheRoleIsNotHeld()
    {
        AnAccount(Role.User).RevokeRole(Role.Validator, by: Paul, administrators: 1, Now).Error.ShouldBe(IdentityErrors.RoleNotHeld);
    }

    [Fact]
    public void RevokeRole_Should_Fail_When_RevokingTheLastAdministrator()
    {
        var paul = AnAccount(Role.Administrator);

        paul.RevokeRole(Role.Administrator, by: paul.Id, administrators: 1, Now).Error.ShouldBe(IdentityErrors.LastAdministrator);
        paul.Role.ShouldBe(Role.Administrator);
    }

    // --- PromoteAsInitialAdministrator ----------------------------------------------------------

    [Fact]
    public void PromoteAsInitialAdministrator_Should_BecomeAdministrator_When_NoAdministratorExists()
    {
        var marc = AnAccount(Role.User);

        marc.PromoteAsInitialAdministrator(administrators: 0, Now).ShouldBeTrue();

        marc.Role.ShouldBe(Role.Administrator);
        marc.DomainEvents.ShouldHaveSingleItem().ShouldBe(new RoleAssigned(marc.Id, Role.Administrator, AssignedBy: null, Now));
    }

    [Fact]
    public void PromoteAsInitialAdministrator_Should_DoNothing_When_AnAdministratorExists()
    {
        var marc = AnAccount(Role.User);

        marc.PromoteAsInitialAdministrator(administrators: 1, Now).ShouldBeFalse();

        marc.Role.ShouldBe(Role.User);
        marc.DomainEvents.ShouldBeEmpty();
    }
}
