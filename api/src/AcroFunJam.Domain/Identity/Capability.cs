namespace AcroFunJam.Domain.Identity;

/// <summary>What a role allows its holder to do (checked by the Api through policies, ADR 0008).</summary>
public enum Capability
{
    Propose,
    ValidateProposals,
    ManageRoles,
}
