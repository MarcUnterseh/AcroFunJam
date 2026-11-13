namespace AcroFunJam.Specs.Support;

/// <summary>
/// The last HTTP response of the scenario, shared by the step classes, so that one outcome step (« la proposition est
/// irrecevable car … ») checks what any proposing step received (pose or revision proposal).
/// </summary>
public sealed class ScenarioResponses
{
    public HttpResponseMessage? Last { get; set; }
}
