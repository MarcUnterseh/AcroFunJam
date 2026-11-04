using AcroFunJam.Application.Identity.GetAccountEmails;
using AcroFunJam.Domain.Identity;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Persistence.Identity;

/// <summary>
/// EF Core adapter of <see cref="IAccountEmailsReader"/>: the addresses of the Identity users, in one query. An account
/// without a stored address is left out, like a deleted one; a stored address that is not valid is invalid stored
/// data, reported explicitly.
/// </summary>
public sealed class EfAccountEmailsReader(AcroFunJamDbContext context) : IAccountEmailsReader
{
    public async Task<IReadOnlyDictionary<AccountId, EmailAddress>> GetEmails(IReadOnlyCollection<AccountId> ids, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(ids);
        var keys = ids.Select(id => id.Value).ToList();
        var users = await context.Users.AsNoTracking()
            .Where(u => keys.Contains(u.Id) && u.Email != null)
            .Select(u => new { u.Id, u.Email })
            .ToListAsync(ct);
        return users.ToDictionary(u => new AccountId(u.Id), u => ToEmailAddress(u.Id, u.Email));
    }

    private static EmailAddress ToEmailAddress(Guid id, string? stored)
    {
        var email = EmailAddress.Create(stored);
        return email.IsSuccess
            ? email.Value!
            : throw new InvalidOperationException($"Invalid e-mail address in identity.users (id {id}): {email.Error!.Code}.");
    }
}
