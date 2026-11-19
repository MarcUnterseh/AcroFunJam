using AcroFunJam.Application.Common;
using AcroFunJam.Application.Catalog.SeedInitialTagList;

namespace AcroFunJam.Api.Endpoints.Catalog;

/// <summary>
/// At start-up (each deployment), seeds the list of tags if it does not exist yet, or brings it up to the current revision of
/// the initial list, before the first call (ADR 0032, ADR 0035).
/// <c>Catalog:SeedInitialTagList</c> set to <c>false</c> skips it (tests starting without a list, or without a database).
/// </summary>
internal sealed class InitialTagListStartup(IServiceScopeFactory scopes, IConfiguration configuration) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!configuration.GetValue("Catalog:SeedInitialTagList", defaultValue: true)) return;

        await using var scope = scopes.CreateAsyncScope();
        var handler = scope.ServiceProvider.GetRequiredService<ICommandHandler<SeedInitialTagList, bool>>();
        // A given revision of the initial list (ADR 0035): the scenarios deploy the list as it was before the tags of the poses.
        var revision = configuration.GetValue<int?>("Catalog:InitialTagListRevision");
        var result = await handler.Handle(new SeedInitialTagList(revision), cancellationToken);
        if (result.IsFailure) throw new InvalidOperationException($"The initial tag list could not be seeded: {result.Error!.Code}.");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
