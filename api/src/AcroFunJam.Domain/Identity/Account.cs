using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Identity;

/// <summary>
/// The role view of an account: who it is and which single, ordered role it holds.
/// Authentication itself (passwords, tokens) is delegated to the identity library (ADR 0008).
/// The number of administrators is given by the caller: the aggregate guards "at least one administrator".
/// </summary>
public sealed class Account : AggregateRoot<AccountId>
{
    public EmailAddress Email { get; }

    public Role Role { get; private set; }

    private Account(AccountId id, EmailAddress email, Role role) : base(id)
    {
        Email = email;
        Role = role;
    }

    /// <summary>Rebuilds an existing account from storage.</summary>
    public static Account Rehydrate(AccountId id, EmailAddress email, Role role) => new(id, email, role);

    /// <summary>Gives the account a role; a lower role demotes it.</summary>
    /// <returns>Whether the role changed (assigning the role already held changes nothing).</returns>
    public Result<bool> AssignRole(Role role, AccountId by, int administrators, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(role);
        if (role == Role.User) return IdentityErrors.UserRoleIsImplicit;
        if (role == Role) return Result<bool>.Success(false);
        if (IsLastAdministrator(administrators)) return IdentityErrors.LastAdministrator;

        Role = role;
        Raise(new RoleAssigned(Id, role, by, now));
        return Result<bool>.Success(true);
    }

    /// <summary>Takes the given role back: the account returns to the user role.</summary>
    public Result<bool> RevokeRole(Role role, AccountId by, int administrators, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(role);
        if (role == Role.User) return IdentityErrors.UserRoleIsImplicit;
        if (role != Role)
        {
            return Role == Role.Administrator && role == Role.Validator
                ? IdentityErrors.AdministratorIsNotValidator
                : IdentityErrors.RoleNotHeld;
        }

        if (IsLastAdministrator(administrators)) return IdentityErrors.LastAdministrator;

        Role = Role.User;
        Raise(new RoleRevoked(Id, role, by, now));
        return Result<bool>.Success(true);
    }

    /// <summary>Bootstrap: the designated account becomes administrator while no administrator exists.</summary>
    /// <returns>Whether the account has been promoted.</returns>
    public bool PromoteAsInitialAdministrator(int administrators, DateTimeOffset now)
    {
        if (administrators > 0 || Role == Role.Administrator) return false;

        Role = Role.Administrator;
        Raise(new RoleAssigned(Id, Role.Administrator, AssignedBy: null, now));
        return true;
    }

    private bool IsLastAdministrator(int administrators) => Role == Role.Administrator && administrators <= 1;
}
