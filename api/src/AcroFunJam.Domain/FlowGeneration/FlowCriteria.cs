using AcroFunJam.Domain.Common;
using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.FlowGeneration;

/// <summary>The length of a flow: its number of transitions, exactly, from 1 to 10 (G5, Q184).</summary>
public sealed record FlowLength
{
    public const int Min = 1;
    public const int Max = 10;

    public int Value { get; }

    private FlowLength(int value) => Value = value;

    public static Result<FlowLength> Create(int? length) => length switch
    {
        null => FlowGenerationErrors.LengthRequired,
        < Min or > Max => FlowGenerationErrors.LengthOutOfRange,
        _ => Result<FlowLength>.Success(new FlowLength(length.Value)),
    };
}

/// <summary>
/// The two ceilings of difficulty (K1, K2, Q186): no pose nor transition of the flow exceeds them, « au plus » inclusive.
/// </summary>
public sealed record DifficultyCeiling(DifficultyLevel Base, DifficultyLevel Flyer)
{
    /// <summary>The base ceiling is checked first, then the flyer one; a code off the scale is refused (K3).</summary>
    public static Result<DifficultyCeiling> FromCodes(string? @base, string? flyer)
    {
        if (@base is null) return FlowGenerationErrors.BaseDifficultyCeilingRequired;
        var baseLevel = DifficultyLevel.FromCode(@base);
        if (baseLevel.IsFailure) return baseLevel.Error!;
        if (flyer is null) return FlowGenerationErrors.FlyerDifficultyCeilingRequired;
        var flyerLevel = DifficultyLevel.FromCode(flyer);
        if (flyerLevel.IsFailure) return flyerLevel.Error!;
        return Result<DifficultyCeiling>.Success(new DifficultyCeiling(baseLevel.Value, flyerLevel.Value));
    }

    public bool Admits(Difficulty difficulty)
    {
        ArgumentNullException.ThrowIfNull(difficulty);
        return difficulty.Base <= Base && difficulty.Flyer <= Flyer;
    }
}

/// <summary>
/// The requested and excluded tags (K4, K6, Q187 to Q190, decisions of 2026-11-19): a step matches when its transition or its
/// arrival pose carries one of the requested tags (none requested: every step); no pose nor transition carries an excluded tag.
/// </summary>
public sealed record TagCriteria(TagSet Requested, TagSet Excluded)
{
    public static TagCriteria None { get; } = new(TagSet.Empty, TagSet.Empty);

    /// <summary>A pose or a transition may be part of the flow: it carries no excluded tag.</summary>
    public bool Admits(TagSet tags)
    {
        ArgumentNullException.ThrowIfNull(tags);
        return !Excluded.Ids.Any(tags.Contains);
    }

    /// <summary>A step (a transition and its arrival pose) matches the requested tags.</summary>
    public bool IsSatisfiedBy(TagSet transition, TagSet arrival)
    {
        ArgumentNullException.ThrowIfNull(transition);
        ArgumentNullException.ThrowIfNull(arrival);
        return Requested.Count == 0 || Requested.Ids.Any(tag => transition.Contains(tag) || arrival.Contains(tag));
    }

    /// <summary>The requested or excluded tags that are not in the list of tags (K8).</summary>
    public TagSet NotInList(TagSet list)
    {
        ArgumentNullException.ThrowIfNull(list);
        return TagSet.Of(Requested.Ids.Concat(Excluded.Ids).Where(tag => !list.Contains(tag)));
    }

    public bool Equals(TagCriteria? other) => other is not null && Requested == other.Requested && Excluded == other.Excluded;

    public override int GetHashCode() => HashCode.Combine(Requested, Excluded);
}

/// <summary>The criteria of a generation: the length, the two ceilings and the tags (ADR 0037).</summary>
public sealed record FlowCriteria(FlowLength Length, DifficultyCeiling Ceiling, TagCriteria Tags)
{
    /// <summary>The length is checked first, then the base ceiling, then the flyer ceiling (order of the HTTP contract).</summary>
    public static Result<FlowCriteria> Create(int? length, string? baseCeiling, string? flyerCeiling, TagSet requested, TagSet excluded)
    {
        var flowLength = FlowLength.Create(length);
        if (flowLength.IsFailure) return flowLength.Error!;
        var ceiling = DifficultyCeiling.FromCodes(baseCeiling, flyerCeiling);
        if (ceiling.IsFailure) return ceiling.Error!;
        return Result<FlowCriteria>.Success(new FlowCriteria(flowLength.Value!, ceiling.Value!, new TagCriteria(requested, excluded)));
    }
}
