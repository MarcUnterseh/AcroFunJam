using AcroFunJam.Domain.FlowGeneration;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.FlowGeneration.GenerateFlow;

/// <summary>A pose of the flow as presented.</summary>
public sealed record PresentedFlowPose(FlowPoseId Id, PoseName Name, Difficulty Difficulty, IReadOnlyList<FlowTag> Tags);

/// <summary>A transition of the flow as presented.</summary>
public sealed record PresentedFlowTransition(
    FlowTransitionId Id, TransitionName? Name, Difficulty Difficulty, TransitionDescription? Description, IReadOnlyList<FlowTag> Tags);

/// <summary>A numbered step: its transition, whether it is a washing machine, and its arrival pose.</summary>
public sealed record GeneratedFlowStep(int Number, PresentedFlowTransition Transition, bool IsWashingMachine, PresentedFlowPose Arrival);

/// <summary>The generated flow as presented (ADR 0037): the start pose, then the steps.</summary>
public sealed record GeneratedFlow(PresentedFlowPose Start, IReadOnlyList<GeneratedFlowStep> Steps);
