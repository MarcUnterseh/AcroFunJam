using AcroFunJam.Domain.Identity;
using AcroFunJam.Infrastructure.Persistence.Identity;
using Microsoft.EntityFrameworkCore;

namespace AcroFunJam.Infrastructure.Tests.Persistence.Identity;

[Trait("Category", "Integration")]
public sealed class EfAccountEmailsReaderTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>, IAsyncLifetime
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    public async ValueTask InitializeAsync()
    {
        await using var context = database.CreateDbContext();
        await context.Database.MigrateAsync(Ct);
        await context.Users.ExecuteDeleteAsync(Ct);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private async Task<AccountId> AnExistingAccount(string? email)
    {
        var userName = email ?? $"user-{Guid.NewGuid():N}";
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = userName,
            Email = email,
            NormalizedEmail = email?.ToUpperInvariant(),
            NormalizedUserName = userName.ToUpperInvariant(),
        };
        await using var context = database.CreateDbContext();
        context.Users.Add(user);
        await context.SaveChangesAsync(Ct);
        return new AccountId(user.Id);
    }

    private static EmailAddress Email(string address) => EmailAddress.Create(address).Value!;

    [Fact]
    public async Task GetEmails_Should_ReturnTheEmailsOfTheGivenAccounts_When_TheyExist()
    {
        var alice = await AnExistingAccount("alice@example.org");
        var bruno = await AnExistingAccount("bruno@example.org");
        await AnExistingAccount("claire@example.org");
        var deleted = new AccountId(Guid.NewGuid());
        await using var context = database.CreateDbContext();

        var emails = await new EfAccountEmailsReader(context).GetEmails([alice, bruno, deleted], Ct);

        emails.ShouldBe(new Dictionary<AccountId, EmailAddress>
        {
            [alice] = Email("alice@example.org"),
            [bruno] = Email("bruno@example.org"),
        }, ignoreOrder: true);
    }

    [Fact]
    public async Task GetEmails_Should_LeaveOutAnAccount_When_ItHasNoStoredEmail()
    {
        var alice = await AnExistingAccount("alice@example.org");
        var withoutEmail = await AnExistingAccount(email: null);
        await using var context = database.CreateDbContext();

        var emails = await new EfAccountEmailsReader(context).GetEmails([alice, withoutEmail], Ct);

        emails.ShouldBe(new Dictionary<AccountId, EmailAddress> { [alice] = Email("alice@example.org") });
    }

    [Fact]
    public async Task GetEmails_Should_FailExplicitly_When_AStoredEmailIsInvalid()
    {
        var corrupted = await AnExistingAccount("not-an-address");
        await using var context = database.CreateDbContext();

        var exception = await Should.ThrowAsync<InvalidOperationException>(
            () => new EfAccountEmailsReader(context).GetEmails([corrupted], Ct));

        exception.Message.ShouldBe($"Invalid e-mail address in identity.users (id {corrupted.Value}): identity.invalid-email.");
    }
}
