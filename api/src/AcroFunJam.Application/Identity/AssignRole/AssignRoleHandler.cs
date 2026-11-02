using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Application.Identity.AssignRole;

/// <returns>Whether the role changed.</returns>
internal sealed class AssignRoleHandler(IAccountRepository accounts, TimeProvider clock) : ICommandHandler<AssignRole, bool>
{
    public Task<Result<bool>> Handle(AssignRole command, CancellationToken ct) =>
        accounts.InRoleChangeTransaction(async transactionCt =>
        {
            var account = await accounts.GetByEmail(command.Email, transactionCt);
            if (account is null) return IdentityErrors.AccountNotFound;

            var changed = account.AssignRole(command.Role, command.By, await accounts.CountAdministrators(transactionCt), clock.GetUtcNow());
            if (changed is { IsSuccess: true, Value: true }) await accounts.Save(account, transactionCt);
            return changed;
        }, ct);
}
