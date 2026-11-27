using System.Net;
using System.Text.Json;
using AcroFunJam.Specs.Support;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Catalog;

/// <summary>
/// The refusals of an addition, a removal or a change of a photo (story 10) or of a video (story 12), checked on the last response
/// of the scenario: the status and the stable code of the ProblemDetails.
/// </summary>
[Binding]
public sealed class CatalogRefusalSteps(ScenarioResponses responses)
{
    private const string RemovalReasons =
        "seul un validateur ou un administrateur gère les photos|la photo n'est plus dans le catalogue" +
        "|seul un validateur ou un administrateur gère les vidéos|la vidéo n'est plus dans le catalogue";

    [Then(@"^l'ajout est (?:refusé|impossible) car (.+)$")]
    [Then(@"^le retrait est (?:refusé|impossible) car (" + RemovalReasons + ")$")]
    [Then(@"^le changement est (?:refusé|impossible) car (.+)$")]
    public async Task ThenItIsRefused(string reason)
    {
        var (status, code) = Refusal(reason);
        var response = responses.Last.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(status, body);
        if (code is not null) JsonSerializer.Deserialize<JsonElement>(body).GetProperty("title").GetString().ShouldBe(code);
    }

    private static (HttpStatusCode Status, string? Code) Refusal(string reason) => reason switch
    {
        "il faut être connecté" => (HttpStatusCode.Unauthorized, null),
        // Story 10: the photos of the poses.
        "seul un validateur ou un administrateur gère les photos" => (HttpStatusCode.Forbidden, "identity.capability-required"),
        "la pose est introuvable dans le catalogue" => (HttpStatusCode.NotFound, "catalog.pose-not-found"),
        "la photo n'est plus dans le catalogue" => (HttpStatusCode.NotFound, "catalog.photo-not-found"),
        "le fichier n'est pas une photo JPEG, PNG, WebP ou HEIC" => (HttpStatusCode.BadRequest, "photo.format-not-accepted"),
        "le fichier de la photo est obligatoire" => (HttpStatusCode.BadRequest, "photo.file-required"),
        "la photo dépasse 10 Mo" => (HttpStatusCode.RequestEntityTooLarge, "photo.too-large"),
        "la photo doit mesurer au moins 800 pixels sur son plus petit côté" => (HttpStatusCode.BadRequest, "photo.too-small"),
        "le texte alternatif est trop long" => (HttpStatusCode.BadRequest, "photo.alt-text-too-long"),
        "le crédit doit nommer l'auteur de la photo" => (HttpStatusCode.BadRequest, "photo.credit-not-an-author"),
        "le crédit de la photo est obligatoire" => (HttpStatusCode.BadRequest, "photo.credit-required"),
        "le crédit de la photo est trop long" => (HttpStatusCode.BadRequest, "photo.credit-too-long"),
        "il faut confirmer les droits sur la photo et l'accord des personnes photographiées" =>
            (HttpStatusCode.BadRequest, "photo.rights-confirmation-required"),
        "la pose a déjà 5 photos" => (HttpStatusCode.Conflict, "catalog.photo-limit-reached"),
        // Story 12: the videos of the transitions.
        "seul un validateur ou un administrateur gère les vidéos" => (HttpStatusCode.Forbidden, "identity.capability-required"),
        "la transition est introuvable dans le catalogue" => (HttpStatusCode.NotFound, "catalog.transition-not-found"),
        "la vidéo n'est plus dans le catalogue" => (HttpStatusCode.NotFound, "catalog.video-not-found"),
        "le fichier n'est pas une vidéo MP4, MOV ou WebM" => (HttpStatusCode.BadRequest, "video.format-not-accepted"),
        "le fichier de la vidéo est obligatoire" => (HttpStatusCode.BadRequest, "video.file-required"),
        "la vidéo dépasse 100 Mo" => (HttpStatusCode.RequestEntityTooLarge, "video.too-large"),
        "la vidéo dure plus de 30 secondes" => (HttpStatusCode.BadRequest, "video.too-long"),
        "la vidéo dure moins de 2 secondes" => (HttpStatusCode.BadRequest, "video.too-short"),
        "la vidéo doit mesurer au moins 480 pixels sur son plus petit côté" => (HttpStatusCode.BadRequest, "video.too-small"),
        "la légende de la vidéo est obligatoire" => (HttpStatusCode.BadRequest, "video.caption-required"),
        "la légende de la vidéo est trop longue" => (HttpStatusCode.BadRequest, "video.caption-too-long"),
        "le crédit doit nommer à qui appartient la vidéo" => (HttpStatusCode.BadRequest, "video.credit-not-an-author"),
        "le crédit de la vidéo est obligatoire" => (HttpStatusCode.BadRequest, "video.credit-required"),
        "le crédit de la vidéo est trop long" => (HttpStatusCode.BadRequest, "video.credit-too-long"),
        "la description de la vidéo est trop longue" => (HttpStatusCode.BadRequest, "video.description-too-long"),
        "il faut confirmer les droits sur la vidéo et l'accord des personnes filmées" =>
            (HttpStatusCode.BadRequest, "video.rights-confirmation-required"),
        "la transition a déjà 3 vidéos" => (HttpStatusCode.Conflict, "catalog.video-limit-reached"),
        _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Motif de refus inconnu."),
    };
}
