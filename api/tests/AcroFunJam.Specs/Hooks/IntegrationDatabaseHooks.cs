using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Hooks;

[Binding]
public static class IntegrationDatabaseHooks
{
    [BeforeFeature("Integration")]
    public static Task StartDatabase() => IntegrationDatabase.EnsureStarted();

    [BeforeScenario("Integration", Order = 0)]
    public static Task ResetDatabase() => IntegrationDatabase.Reset();

    [AfterTestRun]
    public static Task StopDatabase() => IntegrationDatabase.Stop();
}
