using AcroFunJam.Api.Endpoints.Common;
using AcroFunJam.Application.Common;
using AcroFunJam.Application.FlowGeneration;
using AcroFunJam.Application.FlowGeneration.GenerateFlow;
using AcroFunJam.Domain.SharedKernel;
using Microsoft.AspNetCore.Http.HttpResults;

namespace AcroFunJam.Api.Endpoints.FlowGeneration;

/// <summary>The generation of flows (story 9, ADR 0037): anyone, visitor included, draws a flow; nothing is recorded.</summary>
public static class FlowGenerationEndpoints
{
    public static IEndpointRouteBuilder MapFlowGenerationEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGroup("/flow-generation").WithTags("FlowGeneration")
            .MapPost("/flows", GenerateFlow)
            .WithName("GenerateFlow")
            .AllowAnonymous()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);
        return app;
    }

    private static async Task<Results<Ok<GeneratedFlowResponse>, ProblemHttpResult>> GenerateFlow(
        GenerateFlowRequest request, IQueryHandler<GenerateFlow, GeneratedFlow> handler, CancellationToken ct)
    {
        var result = await handler.Handle(
            new GenerateFlow(
                request.Length, request.BaseDifficultyCeiling, request.FlyerDifficultyCeiling,
                request.RequestedTagIds?.Select(id => new TagId(id)).ToList(), request.ExcludedTagIds?.Select(id => new TagId(id)).ToList()),
            ct);
        if (result.IsFailure) return result.Error!.ToProblem();

        var flow = result.Value!;
        return TypedResults.Ok(new GeneratedFlowResponse(
            ToResponse(flow.Start),
            [.. flow.Steps.Select(step => new FlowStepResponse(step.Number, ToResponse(step.Transition), step.IsWashingMachine, ToResponse(step.Arrival)))]));
    }

    private static FlowPoseResponse ToResponse(PresentedFlowPose pose) =>
        new(pose.Id.Value, pose.Name.Value, DifficultyCodes.From(pose.Difficulty.Base), DifficultyCodes.From(pose.Difficulty.Flyer), ToResponse(pose.Tags));

    private static FlowTransitionResponse ToResponse(PresentedFlowTransition transition) =>
        new(
            transition.Id.Value,
            transition.Name?.Value,
            DifficultyCodes.From(transition.Difficulty.Base),
            DifficultyCodes.From(transition.Difficulty.Flyer),
            transition.Description?.Value,
            ToResponse(transition.Tags));

    private static IReadOnlyList<FlowTagResponse> ToResponse(IReadOnlyList<FlowTag> tags) => [.. tags.Select(tag => new FlowTagResponse(tag.Id.Value, tag.Name.Value))];
}

/// <summary>The criteria of a generation: the lists of tags are optional (absent or null: none).</summary>
public sealed record GenerateFlowRequest(
    int? Length, string? BaseDifficultyCeiling, string? FlyerDifficultyCeiling, IReadOnlyList<Guid>? RequestedTagIds, IReadOnlyList<Guid>? ExcludedTagIds);

/// <summary>A tag of a pose or a transition of the flow, in catalog order.</summary>
public sealed record FlowTagResponse(Guid Id, string Name);

public sealed record FlowPoseResponse(
    Guid Id, string Name, DifficultyCode BaseDifficulty, DifficultyCode FlyerDifficulty, IReadOnlyList<FlowTagResponse> Tags);

public sealed record FlowTransitionResponse(
    Guid Id, string? Name, DifficultyCode BaseDifficulty, DifficultyCode FlyerDifficulty, string? Description, IReadOnlyList<FlowTagResponse> Tags);

public sealed record FlowStepResponse(int Number, FlowTransitionResponse Transition, bool IsWashingMachine, FlowPoseResponse Arrival);

/// <summary>A generated flow: its start pose, then its numbered steps.</summary>
public sealed record GeneratedFlowResponse(FlowPoseResponse Start, IReadOnlyList<FlowStepResponse> Steps);
