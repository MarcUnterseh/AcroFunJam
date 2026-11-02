using Microsoft.AspNetCore.Mvc.Testing;

namespace AcroFunJam.Specs.Support.Identity;

/// <summary>
/// The running AcroFunJam of the scenario. "AcroFunJam est déployé avec…" starts a new instance on the same
/// database with another configuration, as a real deployment would (its start-up tasks run again).
/// </summary>
public sealed class Deployment(AcroFunJamApiFactory api) : IDisposable
{
    private readonly List<IDisposable> _deployed = [];

    public WebApplicationFactory<Program> Current { get; private set; } = api;

    public void DeployWithInitialAdministrator(string email)
    {
        var deployed = api.WithWebHostBuilder(builder => builder.UseSetting("Identity:InitialAdministratorEmail", email));
        deployed.CreateClient().Dispose(); // starts the host, hence its start-up tasks
        _deployed.Add(deployed);
        Current = deployed;
    }

    public void Dispose()
    {
        foreach (var deployed in _deployed) deployed.Dispose();
    }
}
