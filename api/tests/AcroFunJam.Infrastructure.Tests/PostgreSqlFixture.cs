using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace AcroFunJam.Infrastructure.Tests;

/// <summary>One disposable PostgreSQL container shared by the integration tests of a collection.</summary>
public sealed class PostgreSqlFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public AcroFunJamDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AcroFunJamDbContext>().UseNpgsql(_container.GetConnectionString()).Options);

    public async ValueTask InitializeAsync() => await _container.StartAsync();

    public async ValueTask DisposeAsync() => await _container.DisposeAsync();
}
