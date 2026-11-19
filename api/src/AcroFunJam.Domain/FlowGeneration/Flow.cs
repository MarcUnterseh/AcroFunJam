namespace AcroFunJam.Domain.FlowGeneration;

/// <summary>A generated flow (G1 to G4): a start pose, then numbered steps, each a transition toward its arrival pose.</summary>
public sealed record Flow(FlowPoseId Start, IReadOnlyList<FlowStep> Steps)
{
    public FlowPoseId End => Steps[^1].To;
}

/// <summary>A step of a flow: its number (from 1), its transition, and the poses it goes from and to.</summary>
public sealed record FlowStep(int Number, FlowTransitionId Transition, FlowPoseId From, FlowPoseId To)
{
    public bool IsWashingMachine => From == To;
}
