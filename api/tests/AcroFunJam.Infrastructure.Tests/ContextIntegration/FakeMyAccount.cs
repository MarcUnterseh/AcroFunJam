using AcroFunJam.Application.Common;
using AcroFunJam.Application.Identity.GetMyAccount;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Infrastructure.Tests.ContextIntegration;

/// <summary>Fake of the Identity query: the current role of each known account.</summary>
internal sealed class FakeMyAccount(Dictionary<Guid, Role> roles) : IQueryHandler<GetMyAccount, MyAccountDto>
{
    public Task<Result<MyAccountDto>> Handle(GetMyAccount query, CancellationToken ct) =>
        Task.FromResult(roles.TryGetValue(query.AccountId.Value, out var role)
            ? Result<MyAccountDto>.Success(new MyAccountDto(EmailAddress.Create("someone@example.org").Value!, role))
            : IdentityErrors.AccountNotFound);
}
