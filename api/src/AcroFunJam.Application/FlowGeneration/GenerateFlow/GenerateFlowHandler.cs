using AcroFunJam.Application.Common;
using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.FlowGeneration;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.FlowGeneration.GenerateFlow;

/// <summary>Checks the criteria first (without reading the catalog), then reads the published graph, draws a flow and presents it.</summary>
internal sealed class GenerateFlowHandler(IPublishedGraphSource source, IRandomSource random) : IQueryHandler<GenerateFlow, GeneratedFlow>
{
    public async Task<Result<GeneratedFlow>> Handle(GenerateFlow query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        var criteria = FlowCriteria.Create(
            query.Length, query.BaseDifficultyCeiling, query.FlyerDifficultyCeiling,
            TagSet.Of(query.RequestedTagIds ?? []), TagSet.Of(query.ExcludedTagIds ?? []));
        if (criteria.IsFailure) return criteria.Error!;

        var published = await source.Read(ct);
        var flow = FlowGenerator.Generate(published.Graph, criteria.Value!, random);
        return flow.IsFailure ? flow.Error! : Result<GeneratedFlow>.Success(Presented(flow.Value!, published));
    }

    private static GeneratedFlow Presented(Flow flow, PublishedGraph published)
    {
        PresentedFlowPose Pose(FlowPoseId id)
        {
            var details = published.Details.Poses[id];
            return new PresentedFlowPose(id, details.Name, published.Graph.Pose(id).Difficulty, details.Tags);
        }

        PresentedFlowTransition Transition(FlowTransitionId id)
        {
            var details = published.Details.Transitions[id];
            return new PresentedFlowTransition(id, details.Name, published.Graph.Transition(id).Difficulty, details.Description, details.Tags);
        }

        return new GeneratedFlow(
            Pose(flow.Start),
            [.. flow.Steps.Select(step => new GeneratedFlowStep(step.Number, Transition(step.Transition), step.IsWashingMachine, Pose(step.To)))]);
    }
}
