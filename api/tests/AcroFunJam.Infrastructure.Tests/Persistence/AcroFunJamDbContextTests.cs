namespace AcroFunJam.Infrastructure.Tests.Persistence;

[Trait("Category", "Integration")]
public sealed class AcroFunJamDbContextTests(PostgreSqlFixture database) : IClassFixture<PostgreSqlFixture>
{
    [Fact]
    public async Task EnsureCreated_Should_CreateTheSchema_When_TheDatabaseIsEmpty()
    {
        await using var context = database.CreateDbContext();

        var created = await context.Database.EnsureCreatedAsync(TestContext.Current.CancellationToken);

        created.ShouldBeTrue();
        (await context.Database.CanConnectAsync(TestContext.Current.CancellationToken)).ShouldBeTrue();
    }
}
