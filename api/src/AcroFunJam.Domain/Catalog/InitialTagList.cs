using AcroFunJam.Domain.SharedKernel;

namespace AcroFunJam.Domain.Catalog;

/// <summary>An initial tag: its name, its description and the name of the initial tag it implies, if any.</summary>
public sealed record InitialTag(TagName Name, TagDescription Description, TagName? Implies);

/// <summary>
/// The tags the list is seeded with at the first deployment, with the descriptions of the acroyoga expert (story 8,
/// decision 1, Q117 to Q119, Q145): « pop », « whip » and « icarien » imply « dynamique » (decision 2, Q136).
/// </summary>
public static class InitialTagList
{
    private static readonly TagName Dynamic = Name("dynamique");

    public static IReadOnlyList<InitialTag> Tags { get; } =
    [
        new(Dynamic, Description("Le passage se fait avec de l'élan : base et flyer se lancent dans le mouvement au lieu de le dérouler lentement."), null),
        new(Name("pop"), Description("La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé."), Dynamic),
        new(Name("whip"), Description("La base balance le flyer et l'élan le fait pivoter d'une prise à l'autre, vers l'avant ou vers l'arrière."), Dynamic),
        new(Name("icarien"), Description("Style où la base, le plus souvent en L-basing, lance, fait tourner et rattrape le flyer surtout avec les pieds."), Dynamic),
        new(Name("lunaire"), Description("Pratique thérapeutique : le flyer, détendu et passif, se laisse porter, étirer ou retourner lentement par la base."), null),
        new(Name("inversion"), Description("Le flyer passe la tête en bas pendant la transition."), null),
        new(Name("vrille"), Description("Le flyer tourne sur lui-même autour de l'axe de son corps, par exemple du ventre vers le dos."), null),
    ];

    private static TagName Name(string name) => TagName.Create(name).Value!;

    private static TagDescription Description(string description) => TagDescription.Create(description).Value!;
}
