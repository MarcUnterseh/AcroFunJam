using AcroFunJam.Application.Common;
using AcroFunJam.Application.Identity.BootstrapInitialAdministrator;
using AcroFunJam.Domain.Identity;

namespace AcroFunJam.Api.Endpoints.Identity;

/// <summary>Reads the designated initial administrator from configuration (<c>Identity:InitialAdministratorEmail</c>).</summary>
internal static class InitialAdministratorDesignation
{
    public static EmailAddress? From(IConfiguration configuration) =>
        EmailAddress.Create(configuration["Identity:InitialAdministratorEmail"]) is { IsSuccess: true } email ? email.Value : null;

    public static async Task Bootstrap(IServiceProvider services, IConfiguration configuration, ILogger log, CancellationToken ct)
    {
        if (From(configuration) is not { } designated) return;

        var handler = services.GetRequiredService<ICommandHandler<BootstrapInitialAdministrator, bool>>();
        var result = await handler.Handle(new BootstrapInitialAdministrator(designated), ct);
        if (result.IsFailure) IdentityLog.InitialAdministratorFailed(log, result.Error!.Code);
        else if (result.Value) IdentityLog.InitialAdministratorPromoted(log, designated.Value);
        else IdentityLog.InitialAdministratorNotPromoted(log, designated.Value);
    }
}

/// <summary>At start-up (each deployment), promotes the designated account if no administrator exists yet.</summary>
internal sealed class InitialAdministratorStartup(
    IServiceScopeFactory scopes, IConfiguration configuration, ILogger<InitialAdministratorStartup> log) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (InitialAdministratorDesignation.From(configuration) is null) return;

        await using var scope = scopes.CreateAsyncScope();
        await InitialAdministratorDesignation.Bootstrap(scope.ServiceProvider, configuration, log, cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
