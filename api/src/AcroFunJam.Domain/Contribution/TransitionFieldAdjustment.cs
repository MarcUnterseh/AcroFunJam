using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Contribution;

/// <summary>
/// A field of a transition the validator adjusted, with the proposed and the retained value (story 7, R16): a closed hierarchy,
/// in the order of the form.
/// </summary>
public abstract record TransitionFieldAdjustment;

/// <summary>The name, given, corrected or removed (none: no name).</summary>
public sealed record TransitionNameAdjustment(TransitionName? Proposed, TransitionName? Retained) : TransitionFieldAdjustment;

public sealed record TransitionBaseDifficultyAdjustment(DifficultyLevel Proposed, DifficultyLevel Retained) : TransitionFieldAdjustment;

public sealed record TransitionFlyerDifficultyAdjustment(DifficultyLevel Proposed, DifficultyLevel Retained) : TransitionFieldAdjustment;

/// <summary>The tags, as sets completed through the list (story 8, E7): none proposed, or none retained, is an empty set.</summary>
public sealed record TransitionTagsAdjustment(TagSet Proposed, TagSet Retained) : TransitionFieldAdjustment;

/// <summary>The description, given, corrected or removed (none: no description).</summary>
public sealed record TransitionDescriptionAdjustment(TransitionDescription? Proposed, TransitionDescription? Retained) : TransitionFieldAdjustment;
