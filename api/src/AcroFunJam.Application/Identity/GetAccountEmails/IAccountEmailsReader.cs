using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity.GetAccountEmails;

/// <summary>Port: reads the e-mail addresses of accounts, in a single query.</summary>
public interface IAccountEmailsReader
{
    /// <returns>The address of each given account that still exists; a deleted account is absent.</returns>
    Task<IReadOnlyDictionary<AccountId, EmailAddress>> GetEmails(IReadOnlyCollection<AccountId> ids, CancellationToken ct);
}
