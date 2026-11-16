using AcroFunJam.Application.Common;
using AcroFunJam.Application.Catalog.SeedInitialTagList;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>
/// At start-up (each deployment), seeds the list of tags if it does not exist yet, before the first call (ADR 0032).
/// <c>Catalog:SeedInitialTagList</c> set to <c>false</c> skips it (tests starting without a list, or without a database).
/// </summary>
internal sealed class InitialTagListStartup(IServiceScopeFactory scopes, IConfiguration configuration) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!configuration.GetValue("Catalog:SeedInitialTagList", defaultValue: true)) return;

        await using var scope = scopes.CreateAsyncScope();
        var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<SeedInitialTagList, bool>>();
        var result = await handler.Handle(new SeedInitialTagList(), cancellationToken);
        if (result.IsFailure) throw new InvalidOperationException($"The initial tag list could not be seeded: {result.Error!.Code}.");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
