using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.Persistence.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Identity;

[Trait("Category", "Integration")]
public sealed class EfAccountRepositoryTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Users.ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private async Task<ApplicationUser> AnExistingUser(string email, string role = "user")
    {
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            NormalizedUserName = email.ToUpperInvariant(),
            Role = role,
        };
        await using var context = database.CreateDbContext();
        context.Users.Add(user);
        await context.SaveChangesAsync(Ct);
        return user;
    }

    [Fact]
    public async Task GetById_Should_ReturnAccountWithUserRole_When_AccountJustRegistered()
    {
        var alice = await AnExistingUser("alice@example.org");

        await using var context = database.CreateDbContext();
        var account = await new EfAccountRepository(context, new UpperInvariantLookupNormalizer()).GetById(new AccountId(alice.Id), Ct);

        account.ShouldNotBeNull();
        account.Email.ShouldBe(EmailAddress.Create("alice@example.org").Value!);
        account.Role.ShouldBe(Role.User);
    }

    [Fact]
    public async Task GetByEmail_Should_FindTheAccount_When_OnlyTheCaseDiffers()
    {
        var alice = await AnExistingUser("alice@example.org");

        await using var context = database.CreateDbContext();
        var account = await new EfAccountRepository(context, new UpperInvariantLookupNormalizer()).GetByEmail(EmailAddress.Create("Alice@Example.org").Value!, Ct);

        account.ShouldNotBeNull().Id.ShouldBe(new AccountId(alice.Id));
    }

    [Fact]
    public async Task Database_Should_RejectASecondAccount_When_TheNormalizedEmailIsAlreadyUsed()
    {
        await AnExistingUser("alice@example.org");
        await using var context = database.CreateDbContext();
        context.Users.Add(new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "alice-bis",
            NormalizedUserName = "ALICE-BIS",
            Email = "Alice@Example.org",
            NormalizedEmail = "ALICE@EXAMPLE.ORG",
        });

        await Should.ThrowAsync<DbUpdateException>(() => context.SaveChangesAsync(Ct));
    }

    [Fact]
    public async Task CountAdministrators_Should_CountOnlyAdministrators_When_AccountsHaveVariousRoles()
    {
        await AnExistingUser("paul@example.org", "administrator");
        await AnExistingUser("bruno@example.org", "administrator");
        await AnExistingUser("alice@example.org", "validator");

        await using var context = database.CreateDbContext();
        (await new EfAccountRepository(context, new UpperInvariantLookupNormalizer()).CountAdministrators(Ct)).ShouldBe(2);
    }

    [Fact]
    public async Task Save_Should_PersistTheNewRole_When_TheRoleChanged()
    {
        var bruno = await AnExistingUser("bruno@example.org");
        await using (var context = database.CreateDbContext())
        {
            var repository = new EfAccountRepository(context, new UpperInvariantLookupNormalizer());
            var account = (await repository.GetById(new AccountId(bruno.Id), Ct))!;
            account.AssignRole(Role.Validator, by: new AccountId(Guid.Empty), administrators: 0, now: DateTimeOffset.UtcNow);
            await repository.Save(account, Ct);
        }

        await using var assert = database.CreateDbContext();
        (await assert.Users.SingleAsync(u => u.Id == bruno.Id, Ct)).Role.ShouldBe("validator");
    }

    [Fact]
    public async Task InRoleChangeTransaction_Should_LetOnlyOneDemotionSucceed_When_TheLastTwoAdministratorsAreDemotedConcurrently()
    {
        var paul = await AnExistingUser("paul@example.org", "administrator");
        var bruno = await AnExistingUser("bruno@example.org", "administrator");
        var bothHaveRead = new Barrier(2);

        Task<AcroFunJam.Domain.Common.Result<bool>> Demote(Guid id) => Task.Run(async () =>
        {
            await using var context = database.CreateDbContext();
            var repository = new EfAccountRepository(context, new UpperInvariantLookupNormalizer());
            return await repository.InRoleChangeTransaction(async ct =>
            {
                var administrators = await repository.CountAdministrators(ct);
                var account = (await repository.GetById(new AccountId(id), ct))!;
                bothHaveRead.SignalAndWait(ct); // both demotions see two administrators
                var demoted = account.AssignRole(Role.Validator, new AccountId(Guid.Empty), administrators, DateTimeOffset.UtcNow);
                if (demoted.IsSuccess) await repository.Save(account, ct);
                return demoted;
            }, Ct);
        }, Ct);

        var results = await Task.WhenAll(Demote(paul.Id), Demote(bruno.Id));

        results.Count(r => r.IsSuccess).ShouldBe(1);
        results.Single(r => r.IsFailure).Error.ShouldBe(IdentityErrors.ConcurrentRoleChange);
        await using var assert = database.CreateDbContext();
        (await assert.Users.CountAsync(u => u.Role == "administrator", Ct)).ShouldBe(1);
    }
}
