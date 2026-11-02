using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.Identity;

/// <summary>Expected errors of the Identity context, with stable codes (ADR 0007).</summary>
public static class IdentityErrors
{
    public static readonly Error AccountNotFound = new("identity.account-not-found", "Aucun compte n'a cette adresse e-mail.");

    public static readonly Error InvalidEmail = new("identity.invalid-email", "L'adresse e-mail est absente ou invalide.");

    public static readonly Error UnknownRole = new("identity.unknown-role", "Ce rôle n'existe pas.");

    public static readonly Error UserRoleIsImplicit =
        new("identity.user-role-is-implicit", "Le rôle utilisateur est celui de tout compte : il ne s'attribue ni ne se retire.");

    public static readonly Error AdministratorIsNotValidator =
        new("identity.administrator-is-not-validator", "Ce compte est administrateur, pas validateur : attribuez-lui le rôle validateur pour le rétrograder.");

    public static readonly Error RoleNotHeld = new("identity.role-not-held", "Ce compte n'a pas ce rôle.");

    public static readonly Error LastAdministrator =
        new("identity.last-administrator", "Il doit rester au moins un administrateur.");

    public static readonly Error ConcurrentRoleChange =
        new("identity.concurrent-role-change", "Les rôles ont été modifiés en même temps par quelqu'un d'autre : réessayez.");
}
