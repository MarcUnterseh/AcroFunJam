using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;

namespace AcroFunJam.Application.Identity.BootstrapInitialAdministrator;

internal sealed class BootstrapInitialAdministratorHandler(IAccountRepository accounts, TimeProvider clock)
    : ICommandHandler<BootstrapInitialAdministrator, bool>
{
    /// <returns>Whether the designated account has been promoted.</returns>
    public Task<Result<bool>> Handle(BootstrapInitialAdministrator command, CancellationToken ct)
    {
        if (command.DesignatedEmail is not { } designated) return Task.FromResult(Result<bool>.Success(false));

        return accounts.InRoleChangeTransaction(async transactionCt =>
        {
            var account = await accounts.GetByEmail(designated, transactionCt);
            if (account is null) return Result<bool>.Success(false);

            if (!account.PromoteAsInitialAdministrator(await accounts.CountAdministrators(transactionCt), clock.GetUtcNow()))
            {
                return Result<bool>.Success(false);
            }

            await accounts.Save(account, transactionCt);
            return Result<bool>.Success(true);
        }, ct);
    }
}
