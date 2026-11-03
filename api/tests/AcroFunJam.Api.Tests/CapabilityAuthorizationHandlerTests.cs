using System.Security.Claims;
using AcroFunJam.Api.Authorization;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.Identity.GetMyAccount;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.Identity;
using Microsoft.AspNetCore.Authorization;

namespace AcroFunJam.Api.Tests;

/// <summary>Only a missing account is a deleted account (401); any other failure stays a refusal.</summary>
public sealed class CapabilityAuthorizationHandlerTests
{
    private sealed class FakeMyAccount(Error error) : IQueryHandler<GetMyAccount, MyAccountDto>
    {
        public Task<Result<MyAccountDto>> Handle(GetMyAccount query, CancellationToken ct) => Task.FromResult<Result<MyAccountDto>>(error);
    }

    private static async Task<AuthorizationHandlerContext> Authorize(Error accountLookup)
    {
        var requirement = new CapabilityRequirement(Capability.Propose);
        var user = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())], "test"));
        var context = new AuthorizationHandlerContext([requirement], user, resource: null);
        await new CapabilityAuthorizationHandler(new FakeMyAccount(accountLookup)).HandleAsync(context);
        return context;
    }

    [Fact]
    public async Task Handle_Should_ReportADeletedAccount_When_TheAccountIsNotFound()
    {
        var context = await Authorize(IdentityErrors.AccountNotFound);

        context.HasSucceeded.ShouldBeFalse();
        context.FailureReasons.Select(r => r.Message).ShouldBe([CapabilityAuthorizationHandler.AccountDeleted]);
    }

    [Fact]
    public async Task Handle_Should_NotReportADeletedAccount_When_TheLookupFailsForAnotherReason()
    {
        var context = await Authorize(new Error("identity.unavailable", "Indisponible."));

        context.HasSucceeded.ShouldBeFalse();
        context.FailureReasons.ShouldBeEmpty();
    }
}
