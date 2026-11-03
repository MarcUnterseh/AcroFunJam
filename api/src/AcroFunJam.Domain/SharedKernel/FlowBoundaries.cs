using AcroFunJam.Domain.Common;

namespace AcroFunJam.Domain.SharedKernel;

/// <summary>
/// Whether a pose can start a flow (the duo sets up in it straight from the ground) and whether it can end one
/// (the flyer comes down straight and safely from it). A pose may have neither.
/// </summary>
public sealed record FlowBoundaries
{
    public bool CanStartFlow { get; }

    public bool CanEndFlow { get; }

    private FlowBoundaries(bool canStartFlow, bool canEndFlow)
    {
        CanStartFlow = canStartFlow;
        CanEndFlow = canEndFlow;
    }

    /// <summary>Both indicators are required, without default value; the start is checked first.</summary>
    public static Result<FlowBoundaries> Create(bool? canStartFlow, bool? canEndFlow)
    {
        if (canStartFlow is null) return PoseContentErrors.CanStartFlowRequired;
        if (canEndFlow is null) return PoseContentErrors.CanEndFlowRequired;
        return Result<FlowBoundaries>.Success(new FlowBoundaries(canStartFlow.Value, canEndFlow.Value));
    }
}
