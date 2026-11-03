using AcroFunJam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Respawn;
using Testcontainers.PostgreSql;

namespace AcroFunJam.Specs.Support.Identity;

/// <summary>
/// One PostgreSQL container for the whole test run, started lazily by the first @Integration feature,
/// migrated once and reset before each scenario (ADR 0009). Features with fakes never start it.
/// </summary>
public static class IntegrationDatabase
{
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private static PostgreSqlContainer? _container;
    private static Respawner? _respawner;

    public static string? ConnectionString => _container?.GetConnectionString();

    /// <summary>Whether the scenario belongs to an @Integration feature (or is tagged so).</summary>
    public static bool IsUsedBy(Reqnroll.ScenarioInfo scenario)
    {
        ArgumentNullException.ThrowIfNull(scenario);
        return scenario.CombinedTags.Contains("Integration", StringComparer.Ordinal);
    }

    public static async Task EnsureStarted()
    {
        await Gate.WaitAsync();
        try
        {
            if (_container is not null) return;

            var container = new PostgreSqlBuilder("postgres:17-alpine").Build();
            await container.StartAsync();

            var options = new DbContextOptionsBuilder<AcroFunJamDbContext>().UseNpgsql(container.GetConnectionString()).Options;
            await using (var context = new AcroFunJamDbContext(options))
            {
                await context.Database.MigrateAsync();
            }

            await using var connection = new NpgsqlConnection(container.GetConnectionString());
            await connection.OpenAsync();
            _respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
            {
                DbAdapter = DbAdapter.Postgres,
                TablesToIgnore = ["__EFMigrationsHistory"],
            });
            _container = container;
        }
        finally
        {
            Gate.Release();
        }
    }

    public static async Task Reset()
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await _respawner!.ResetAsync(connection);
    }

    public static async Task Stop()
    {
        if (_container is not null) await _container.DisposeAsync();
    }
}
