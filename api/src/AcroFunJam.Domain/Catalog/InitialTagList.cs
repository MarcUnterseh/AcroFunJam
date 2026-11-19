using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>An initial tag: its name, its description, the name of the initial tag it implies, if any, and what it applies to.</summary>
public sealed record InitialTag(TagName Name, TagDescription Description, TagName? Implies, TagScope Scope);

/// <summary>A revision of the initial list (ADR 0035): its number and its tags.</summary>
public sealed record InitialTagListRevision(int Number, IReadOnlyList<InitialTag> Tags);

/// <summary>
/// The tags the list is seeded with at the first deployment, with the descriptions of the acroyoga expert (story 8,
/// decision 1, Q117 to Q119, Q145): « pop », « whip » and « icarien » imply « dynamique » (decision 2, Q136). Versioned
/// (ADR 0035): revision 1 is the list of story 8 (transitions only); revision 2 (story 9a, Q165, Q166) makes « inversion » and
/// « lunaire » apply to the poses too, with descriptions valid for both. A list seeded at an older revision is brought up
/// to date at start-up (<see cref="TagList.Upgrade"/>).
/// </summary>
public static class InitialTagList
{
    private static readonly TagName Dynamic = Name("dynamique");

    private static readonly InitialTagListRevision First = new(1,
    [
        new(Dynamic, Description("Le passage se fait avec de l'élan : base et flyer se lancent dans le mouvement au lieu de le dérouler lentement."), null, TagScope.Transitions),
        new(Name("pop"), Description("La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé."), Dynamic, TagScope.Transitions),
        new(Name("whip"), Description("La base balance le flyer et l'élan le fait pivoter d'une prise à l'autre, vers l'avant ou vers l'arrière."), Dynamic, TagScope.Transitions),
        new(Name("icarien"), Description("Style où la base, le plus souvent en L-basing, lance, fait tourner et rattrape le flyer surtout avec les pieds."), Dynamic, TagScope.Transitions),
        new(Name("lunaire"), Description("Pratique thérapeutique : le flyer, détendu et passif, se laisse porter, étirer ou retourner lentement par la base."), null, TagScope.Transitions),
        new(Name("inversion"), Description("Le flyer passe la tête en bas pendant la transition."), null, TagScope.Transitions),
        new(Name("vrille"), Description("Le flyer tourne sur lui-même autour de l'axe de son corps, par exemple du ventre vers le dos."), null, TagScope.Transitions),
    ]);

    private static readonly InitialTagListRevision PoseTags = new(2, [.. First.Tags.Select(tag => tag.Name.Value switch
    {
        "lunaire" => tag with
        {
            Description = Description("Pratique thérapeutique : le flyer, détendu et passif, se laisse porter et étirer par la base ; les passages se font lentement. Ex. : Folded Leaf, Straddle Bat."),
            Scope = TagScope.PosesAndTransitions,
        },
        "inversion" => tag with
        {
            Description = Description("La tête du flyer est plus basse que ses hanches, dans la pose ou à un moment de la transition. Ex. : Candlestick, Straddle Bat."),
            Scope = TagScope.PosesAndTransitions,
        },
        _ => tag,
    })]);

    /// <summary>Every revision, the oldest first.</summary>
    public static IReadOnlyList<InitialTagListRevision> Revisions { get; } = [First, PoseTags];

    /// <summary>The revision a new deployment brings.</summary>
    public static InitialTagListRevision Current => Revisions[^1];

    /// <summary>The tags of the current revision.</summary>
    public static IReadOnlyList<InitialTag> Tags => Current.Tags;

    public static InitialTagListRevision Revision(int number) => Revisions.Single(r => r.Number == number);

    private static TagName Name(string name) => TagName.Create(name).Value!;

    private static TagDescription Description(string description) => TagDescription.Create(description).Value!;
}
