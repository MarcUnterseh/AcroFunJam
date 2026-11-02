using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity.GetMyAccount;

internal sealed class GetMyAccountHandler(IAccountRepository accounts) : IQueryHandler<GetMyAccount, MyAccountDto>
{
    public async Task<Result<MyAccountDto>> Handle(GetMyAccount query, CancellationToken ct)
    {
        var account = await accounts.GetById(query.AccountId, ct);
        return account is null
            ? IdentityErrors.AccountNotFound
            : Result<MyAccountDto>.Success(new MyAccountDto(account.Email, account.Role));
    }
}
