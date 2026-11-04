using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity.GetAccountEmails;

/// <summary>
/// The e-mail addresses of several accounts, in one query (Open Host Service of Identity, ADR 0022). A deleted
/// account has no address.
/// </summary>
public sealed record GetAccountEmails(IReadOnlyCollection<AccountId> Accounts);
