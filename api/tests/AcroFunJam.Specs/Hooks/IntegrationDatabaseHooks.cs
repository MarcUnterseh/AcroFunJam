using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Hooks;

[Binding]
public static class IntegrationDatabaseHooks
{
    // The @Integration features share one database reset before each scenario: they run one after the other,
    // so that a reset never wipes the data of a scenario running in parallel (ADR 0020).
    private static readonly SemaphoreSlim OneIntegrationFeatureAtATime = new(1, 1);

    [BeforeFeature("Integration")]
    public static async Task StartDatabase()
    {
        await OneIntegrationFeatureAtATime.WaitAsync();
        try
        {
            await IntegrationDatabase.EnsureStarted();
        }
        catch
        {
            OneIntegrationFeatureAtATime.Release();
            throw;
        }
    }

    [AfterFeature("Integration")]
    public static void ReleaseDatabase() => OneIntegrationFeatureAtATime.Release();

    [BeforeScenario("Integration", Order = 0)]
    public static Task ResetDatabase() => IntegrationDatabase.Reset();

    [AfterTestRun]
    public static Task StopDatabase() => IntegrationDatabase.Stop();
}
