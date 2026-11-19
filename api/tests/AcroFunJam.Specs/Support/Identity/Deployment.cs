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

    /// <summary>
    /// A deployment that seeds the initial tag list, as every real one does (ADR 0032); the scenarios otherwise start
    /// without it (<see cref="AcroFunJamApiFactory"/>).
    /// </summary>
    /// <summary>A deployment seeding (or bringing up to date) the initial list, at its current revision unless stated (ADR 0035).</summary>
    public void DeploySeedingTheInitialTagList(int? revision = null)
    {
        var deployed = api.WithWebHostBuilder(builder =>
        {
            builder.UseSetting(InitialTagListSetting, "true");
            if (revision is { } r) builder.UseSetting(InitialTagListRevisionSetting, r.ToString(System.Globalization.CultureInfo.InvariantCulture));
        });
        deployed.CreateClient().Dispose(); // starts the host, hence its start-up tasks
        _deployed.Add(deployed);
        Current = deployed;
    }

    /// <summary>Whether a deployment seeds the initial tag list at start-up (ADR 0032).</summary>
    public const string InitialTagListSetting = "Catalog:SeedInitialTagList";

    /// <summary>The revision of the initial tag list a deployment brings (ADR 0035); the current one when absent.</summary>
    public const string InitialTagListRevisionSetting = "Catalog:InitialTagListRevision";

    public void Dispose()
    {
        foreach (var deployed in _deployed) deployed.Dispose();
    }
}
