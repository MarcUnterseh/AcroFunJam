using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity.GetAccountEmails;

internal sealed class GetAccountEmailsHandler(IAccountEmailsReader reader)
    : IQueryHandler<GetAccountEmails, IReadOnlyDictionary<AccountId, EmailAddress>>
{
    public async Task<Result<IReadOnlyDictionary<AccountId, EmailAddress>>> Handle(GetAccountEmails query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        return Result<IReadOnlyDictionary<AccountId, EmailAddress>>.Success(await reader.GetEmails(query.Accounts, ct));
    }
}
