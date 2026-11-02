using Reqnroll;
using Reqnroll.UnitTestProvider;

namespace AcroFunJam.Specs.Hooks;

/// <summary>
/// The feature files are shared by the API, web and mobile runners:
/// only scenarios tagged @api (and not @wip) are executed here; the others are reported as skipped.
/// </summary>
[Binding]
public sealed class TagFilterHooks(ScenarioContext scenarioContext, IUnitTestRuntimeProvider runtime)
{
    [BeforeScenario(Order = int.MinValue)]
    public void SkipScenariosNotTargetingTheApi()
    {
        var tags = scenarioContext.ScenarioInfo.CombinedTags;
        if (!tags.Contains("api"))
        {
            runtime.TestIgnore("Scénario hors périmètre API (pas de tag @api).");
        }
        else if (tags.Contains("wip"))
        {
            runtime.TestIgnore("Scénario @wip : pas encore implémenté.");
        }
    }
}
