using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity.GetMyAccount;

/// <summary>The account of the signed-in person: e-mail address, role and capabilities.</summary>
public sealed record GetMyAccount(AccountId AccountId);

public sealed record MyAccountDto(EmailAddress Email, Role Role);
