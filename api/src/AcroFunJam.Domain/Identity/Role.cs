using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Identity;

/// <summary>
/// The single, ordered role of an account: user &lt; validator &lt; administrator (ADR 0008).
/// Each role adds capabilities to the previous one.
/// </summary>
public sealed record Role
{
    public static Role User { get; } = new("user", [Capability.Propose]);

    public static Role Validator { get; } = new("validator", [.. User.Capabilities, Capability.ValidateProposals]);

    public static Role Administrator { get; } = new("administrator", [.. Validator.Capabilities, Capability.ManageRoles]);

    /// <summary>Role of every newly created account.</summary>
    public static Role Default => User;

    private static readonly Role[] All = [User, Validator, Administrator];

    public string Code { get; }

    public IReadOnlyCollection<Capability> Capabilities { get; }

    private Role(string code, Capability[] capabilities)
    {
        Code = code;
        Capabilities = capabilities;
    }

    public static Result<Role> FromCode(string? code) =>
        All.SingleOrDefault(r => r.Code == code) is { } role ? Result<Role>.Success(role) : IdentityErrors.UnknownRole;

    public bool Grants(Capability capability) => Capabilities.Contains(capability);

    // Identity of a role is its code (the capability collection has reference equality).
    public bool Equals(Role? other) => other is not null && Code == other.Code;

    public override int GetHashCode() => Code.GetHashCode(StringComparison.Ordinal);
}
