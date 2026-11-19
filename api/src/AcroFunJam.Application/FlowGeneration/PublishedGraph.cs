using AcroFunJam.Domain.FlowGeneration;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Application.FlowGeneration;

/// <summary>A tag of a pose or a transition of the flow, with its name.</summary>
public sealed record FlowTag(TagId Id, TagName Name);

/// <summary>What presents a pose: its name and its tags, in catalog order.</summary>
public sealed record FlowPoseDetails(PoseName Name, IReadOnlyList<FlowTag> Tags);

/// <summary>What presents a transition: its name and description (if any) and its tags, in catalog order.</summary>
public sealed record FlowTransitionDetails(TransitionName? Name, TransitionDescription? Description, IReadOnlyList<FlowTag> Tags);

/// <summary>The details of presentation of every element of the graph (ADR 0037, option 2c): the domain stays without names.</summary>
public sealed record FlowElementDetails(
    IReadOnlyDictionary<FlowPoseId, FlowPoseDetails> Poses, IReadOnlyDictionary<FlowTransitionId, FlowTransitionDetails> Transitions);

/// <summary>The published graph and its details, read in one go: the flow presented is the one the generator checked.</summary>
public sealed record PublishedGraph(FlowGraph Graph, FlowElementDetails Details);
