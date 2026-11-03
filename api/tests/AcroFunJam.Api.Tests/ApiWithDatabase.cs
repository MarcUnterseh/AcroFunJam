using AcroFunJam.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using Testcontainers.PostgreSql;

namespace AcroFunJam.Api.Tests;

/// <summary>The real Api on a disposable PostgreSQL, with a controllable clock (ADR 0009).</summary>
public sealed class ApiWithDatabase : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder("postgres:17-alpine").Build();

    // Starts at the real time: the test client compares the cookie expiry with the real clock.
    public FakeTimeProvider Clock { get; } = new(TimeProvider.System.GetUtcNow());

    /// <summary>An HTTPS client (the session cookie is <c>Secure</c>), keeping its cookies.</summary>
    public HttpClient CreateBrowserClient(bool handleCookies = true) =>
        CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = handleCookies,
            AllowAutoRedirect = false,
        });

    public async ValueTask InitializeAsync()
    {
        await _database.StartAsync();
        var options = new DbContextOptionsBuilder<AcroFunJamDbContext>().UseNpgsql(_database.GetConnectionString()).Options;
        await using var context = new AcroFunJamDbContext(options);
        await context.Database.MigrateAsync();
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _database.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:AcroFunJam", _database.GetConnectionString());
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
            services.Configure<PasswordHasherOptions>(options => options.IterationCount = 1);
        });
    }
}
