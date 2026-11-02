using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity.RevokeRole;

internal sealed class RevokeRoleHandler(IAccountRepository accounts, TimeProvider clock) : ICommandHandler<RevokeRole, bool>
{
    public Task<Result<bool>> Handle(RevokeRole command, CancellationToken ct) =>
        accounts.InRoleChangeTransaction(async transactionCt =>
        {
            var account = await accounts.GetByEmail(command.Email, transactionCt);
            if (account is null) return IdentityErrors.AccountNotFound;

            var revoked = account.RevokeRole(command.Role, command.By, await accounts.CountAdministrators(transactionCt), clock.GetUtcNow());
            if (revoked.IsSuccess) await accounts.Save(account, transactionCt);
            return revoked;
        }, ct);
}
