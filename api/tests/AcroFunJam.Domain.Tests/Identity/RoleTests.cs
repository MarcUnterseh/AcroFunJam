using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Domain.Tests.Identity;

public sealed class RoleTests
{
    [Fact]
    public void Default_Should_BeUser_When_AnAccountIsCreated()
    {
        Role.Default.ShouldBe(Role.User);
        Role.Default.Code.ShouldBe("user");
    }

    public static TheoryData<string, Capability[]> CapabilitiesByRole() => new()
    {
        { "user", [Capability.Propose] },
        { "validator", [Capability.Propose, Capability.ValidateProposals] },
        { "administrator", [Capability.Propose, Capability.ValidateProposals, Capability.ManageRoles] },
    };

    [Theory]
    [MemberData(nameof(CapabilitiesByRole))]
    public void Capabilities_Should_AddUpToThePreviousRole_When_RoleIsHigher(string code, Capability[] expected)
    {
        var role = Role.FromCode(code).Value!;

        role.Capabilities.ShouldBe(expected, ignoreOrder: true);
    }

    [Fact]
    public void Grants_Should_ReturnFalse_When_TheRoleDoesNotHaveTheCapability()
    {
        Role.Validator.Grants(Capability.ValidateProposals).ShouldBeTrue();
        Role.Validator.Grants(Capability.ManageRoles).ShouldBeFalse();
    }

    [Fact]
    public void FromCode_Should_Fail_When_TheCodeIsUnknown()
    {
        Role.FromCode("superuser").Error.ShouldBe(IdentityErrors.UnknownRole);
    }
}
