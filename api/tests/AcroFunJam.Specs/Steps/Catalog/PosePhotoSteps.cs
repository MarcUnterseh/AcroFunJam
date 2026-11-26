using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Infrastructure.Persistence.Identity;
using AcroFunJam.Specs.Support;
using AcroFunJam.Specs.Support.Catalog;
using AcroFunJam.Specs.Support.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Catalog;

/// <summary>
/// Story 10: the photos of the poses (ADR 0039). Added through POST /catalog/poses/{id}/photos (multipart), managed through
/// PUT and DELETE, presented on the page of a pose and as a thumbnail in the catalog, served by GET /catalog/photos/{id}/{size}.
/// A pose is found by its name, a photo by its alternative text.
/// </summary>
[Binding]
public sealed class PosePhotoSteps(People people, RoleSetter roles, Deployment deployment, ScenarioResponses responses, ScenarioClock clock)
{
    private const string File = "(" + TestPhotoFiles.Pattern + ")";

    /// <summary>« , avec le texte alternatif « … » et le crédit « … » », « , sans crédit »…, or nothing.</summary>
    private const string Details = "(.*)";

    private const string DefaultAltText = "Photo de test";
    private const string DefaultCredit = "Léa Martin";

    // --- Set-up ---------------------------------------------------------------------------------

    [Given(@"^(\w+) a ajouté (?:entre-temps )?à la pose ""([^""]+)"" " + File + Details + "$")]
    public async Task GivenSomeoneHasAddedAPhoto(string person, string pose, string file, string details)
    {
        await WhenSomeoneAddsAPhoto(person, pose, file, details);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.Created, await responses.Last.Content.ReadAsStringAsync());
    }

    [Given(@"^la pose ""([^""]+)"" a déjà 5 photos$")]
    public Task GivenThePoseHasAlreadyFivePhotos(string pose) => GivenThePoseHasAlreadyFivePhotosAmong(pose, null);

    [Given(@"^la pose ""([^""]+)"" a déjà 5 photos, dont « ([^»]+) »$")]
    public async Task GivenThePoseHasAlreadyFivePhotosAmong(string pose, string? among)
    {
        var client = await Manager();
        var altTexts = new[] { among ?? "Photo 1", "Photo 2", "Photo 3", "Photo 4", "Photo 5" };
        foreach (var altText in altTexts) await Added(client, pose, "une photo JPEG de 1 Mo de 1600×1200", altText, DefaultCredit);
    }

    [Given(@"^la pose ""([^""]+)"" a pour photos, dans cet ordre :$")]
    public async Task GivenThePoseHasThePhotos(string pose, DataTable photos)
    {
        var client = await Manager();
        foreach (var row in photos.Rows) await Added(client, pose, row["fichier"], row["texte alternatif"], row["crédit"]);
    }

    [Given(@"^(\w+) a retiré de la pose ""([^""]+)"" la photo « ([^»]+) »$")]
    public async Task GivenSomeoneHasRemovedAPhoto(string person, string pose, string altText)
    {
        await WhenSomeoneRemovesAPhoto(person, pose, altText);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.NoContent, await responses.Last.Content.ReadAsStringAsync());
    }

    [Given(@"^(\w+) a choisi « ([^»]+) » comme photo principale de la pose ""([^""]+)""$")]
    public async Task GivenSomeoneHasChosenTheMainPhoto(string person, string altText, string pose)
    {
        var client = await people.SignedInClient(person);
        var (poseId, photo) = await PhotoOf(client, pose, altText);
        var response = await client.PutAsJsonAsync(new Uri($"/catalog/poses/{poseId}/photos/main", UriKind.Relative), new { photoId = photo.Id });
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent, await response.Content.ReadAsStringAsync());
    }

    [Given(@"^(\w+) a changé (le texte alternatif|le crédit) de la photo « ([^»]+) » en « ([^»]+) »$")]
    public async Task GivenSomeoneHasCorrectedAPhoto(string person, string field, string altText, string value)
    {
        await Correct(person, altText, field, value);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.OK, await responses.Last.Content.ReadAsStringAsync());
    }

    // --- Adding, removing, correcting -----------------------------------------------------------

    [When(@"^(\w+) ajoute le (\d{4}-\d{2}-\d{2}) à la pose ""([^""]+)"" " + File + Details + "$")]
    public Task WhenSomeoneAddsAPhotoOn(string person, string day, string pose, string file, string details)
    {
        clock.SetUtcNow(ScenarioClock.Parse(day));
        return WhenSomeoneAddsAPhoto(person, pose, file, details);
    }

    [When(@"^(\w+) ajoute à la pose ""([^""]+)"" " + File + Details + "$")]
    public async Task WhenSomeoneAddsAPhoto(string person, string pose, string file, string details)
    {
        var client = await people.SignedInClient(person);
        responses.Last = await Add(client, await PoseIdOf(client, pose), file, details);
    }

    [When(@"^un visiteur ajoute à la pose ""([^""]+)"" " + File + "$")]
    public async Task WhenAVisitorAddsAPhoto(string pose, string file)
    {
        using var visitor = deployment.Current.CreateClient();
        responses.Last = await Add(visitor, await PoseIdOf(visitor, pose), file, string.Empty);
    }

    [When(@"^(\w+) ajoute à une pose qui n'existe pas dans le catalogue " + File + "$")]
    public async Task WhenSomeoneAddsAPhotoToAnUnknownPose(string person, string file) =>
        responses.Last = await Add(await people.SignedInClient(person), Guid.NewGuid(), file, string.Empty);

    [When(@"^(\w+) retire de la pose ""([^""]+)"" la photo « ([^»]+) »$")]
    public async Task WhenSomeoneRemovesAPhoto(string person, string pose, string altText)
    {
        var client = await people.SignedInClient(person);
        var (poseId, photo) = await PhotoOf(await Manager(), pose, altText, mayBeRemoved: true);
        responses.Last = await client.DeleteAsync(new Uri($"/catalog/poses/{poseId}/photos/{photo.Id}", UriKind.Relative));
    }

    [When(@"^(\w+) change le texte alternatif de la photo « ([^»]+) » en un texte fait seulement d'espaces$")]
    public Task WhenSomeoneChangesTheAltTextToSpaces(string person, string altText) => Correct(person, altText, "le texte alternatif", "    ");

    [When(@"^(\w+) change le texte alternatif de la photo « ([^»]+) » en un texte alternatif de (\d+) caractères$")]
    public Task WhenSomeoneChangesTheAltTextToALongOne(string person, string altText, int length) =>
        Correct(person, altText, "le texte alternatif", new string('a', length));

    [When(@"^un visiteur ouvre l'adresse de la photo retirée « ([^»]+) »$")]
    public async Task WhenAVisitorOpensTheAddressOfARemovedPhoto(string altText)
    {
        using var visitor = deployment.Current.CreateClient();
        responses.Last = await visitor.GetAsync(new Uri(_removedPages[altText], UriKind.Relative));
    }

    // --- Outcome --------------------------------------------------------------------------------

    [Then(@"^l'ajout est (?:refusé|impossible) car (.+)$")]
    [Then(@"^le retrait est (?:refusé|impossible) car ((?:seul un validateur ou un administrateur gère les photos|la photo n'est plus dans le catalogue))$")]
    [Then(@"^le changement est (?:refusé|impossible) car (.+)$")]
    public async Task ThenItIsRefused(string reason)
    {
        var (status, code) = reason switch
        {
            "il faut être connecté" => (HttpStatusCode.Unauthorized, (string?)null),
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
            _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Motif de refus inconnu."),
        };
        var response = responses.Last.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(status, body);
        if (code is not null) JsonSerializer.Deserialize<JsonElement>(body).GetProperty("title").GetString().ShouldBe(code);
    }

    [Then("la photo est introuvable")]
    public void ThenThePhotoIsNotFound() => responses.Last.ShouldNotBeNull().StatusCode.ShouldBe(HttpStatusCode.NotFound);

    // --- Presenting -----------------------------------------------------------------------------

    [Then(@"^la page présente la pose ""([^""]+)"" avec exactement les photos :$")]
    public async Task ThenThePagePresentsExactlyThePhotos(string pose, DataTable expected) =>
        (await Photos(pose)).Select(p => (p.AltText, p.Credit))
            .ShouldBe(expected.Rows.Select(r => ((string?)r["texte alternatif"], r["crédit"])));

    [Then(@"^la pose ""([^""]+)"" présente (\d+) photos?$")]
    public Task ThenThePosePresentsSoManyPhotos(string pose, int count) => ThenThePosePresentsSoManyPhotosAmong(pose, count, null);

    [Then(@"^la pose ""([^""]+)"" présente (\d+) photos?, dont « ([^»]+) »$")]
    public async Task ThenThePosePresentsSoManyPhotosAmong(string pose, int count, string? among)
    {
        var photos = await Photos(pose);
        photos.Count.ShouldBe(count);
        if (among is not null) photos.Select(p => p.AltText).ShouldContain(among);
    }

    [Then(@"^la pose ""([^""]+)"" présente la photo « ([^»]+) »$")]
    [Then(@"^la page présente la pose ""([^""]+)"" avec la photo « ([^»]+) »$")]
    public async Task ThenThePosePresentsThePhoto(string pose, string altText) =>
        (await Photos(pose)).Select(p => p.AltText).ShouldContain(altText);

    [Then(@"^la page présente la pose ""([^""]+)"" avec (\d+) photos?, sans texte alternatif$")]
    public async Task ThenThePagePresentsPhotosWithoutAltText(string pose, int count)
    {
        var photos = await Photos(pose);
        photos.Count.ShouldBe(count);
        photos.ShouldAllBe(p => p.AltText == null);
    }

    [Then(@"^la page présente la pose ""([^""]+)"" sans photo$")]
    public async Task ThenThePagePresentsThePoseWithoutPhoto(string pose) => (await Photos(pose)).ShouldBeEmpty();

    [Then(@"^la photo de la pose ""([^""]+)"" est créditée « ([^»]+) »$")]
    public async Task ThenThePhotoIsCredited(string pose, string credit) => (await Photos(pose)).Single().Credit.ShouldBe(credit);

    [Then(@"^la photo « ([^»]+) » de la pose ""([^""]+)"" est créditée « ([^»]+) »$")]
    public async Task ThenThatPhotoIsCredited(string altText, string pose, string credit) =>
        (await Photos(pose)).Single(p => p.AltText == altText).Credit.ShouldBe(credit);

    [Then(@"^la page présente les photos de la pose ""([^""]+)"" dans cet ordre : (« .+ »)$")]
    public async Task ThenThePhotosArePresentedInOrder(string pose, string altTexts) =>
        (await Photos(pose)).Select(p => p.AltText).ShouldBe(Quoted(altTexts));

    [Then(@"^la photo principale de la pose ""([^""]+)"" est « ([^»]+) »$")]
    public async Task ThenTheMainPhotoIs(string pose, string altText) => (await Photos(pose))[0].AltText.ShouldBe(altText);

    [Then(@"^la photo de la pose ""([^""]+)"" garde la confirmation des droits donnée par (\w+) le (\d{4}-\d{2}-\d{2})$")]
    public async Task ThenThePhotoKeepsTheConfirmation(string pose, string person, string day)
    {
        using var client = deployment.Current.CreateClient();
        var poseId = await PoseIdOf(client, pose);
        using var scope = deployment.Current.Services.CreateScope();
        var account = await scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>().FindByEmailAsync(people[person].Email);
        var photos = await scope.ServiceProvider.GetRequiredService<IPosePhotosRepository>().GetFor(new PoseId(poseId), CancellationToken.None);
        var rights = photos.ShouldNotBeNull().InPresentationOrder().Single().Rights;
        rights.ConfirmedBy.Value.ShouldBe(account.ShouldNotBeNull().Id);
        ScenarioClock.DayOf(rights.ConfirmedAt).ShouldBe(day);
    }

    [Then(@"^la photo présentée de la pose ""([^""]+)"" ne contient aucune métadonnée$")]
    public async Task ThenThePresentedPhotoHasNoMetadata(string pose)
    {
        using var client = deployment.Current.CreateClient();
        foreach (var source in (await Photos(pose)).Single().Sources.All)
        {
            var content = await client.GetByteArrayAsync(new Uri(source, UriKind.Relative));
            Encoding.ASCII.GetString(content).ShouldBe(TestPhotoFiles.RenderedContent);
        }
    }

    [Then(@"^la photo présentée de la pose ""([^""]+)"" est en portrait$")]
    public async Task ThenThePresentedPhotoIsPortrait(string pose)
    {
        var photo = (await Photos(pose)).Single();
        photo.Height.ShouldBeGreaterThan(photo.Width);
    }

    [Then(@"^la pose ""([^""]+)"" est présentée avec la vignette de sa photo « ([^»]+) »$")]
    public async Task ThenThePoseIsPresentedWithTheThumbnail(string pose, string altText)
    {
        using var client = deployment.Current.CreateClient();
        var thumbnail = (await List(client)).Single(p => p.Name == pose).Thumbnail;
        thumbnail.ShouldBe((await Photos(pose)).Single(p => p.AltText == altText).Sources.Thumbnail);
    }

    [Then(@"^la pose ""([^""]+)"" est présentée sans vignette$")]
    public async Task ThenThePoseIsPresentedWithoutThumbnail(string pose)
    {
        using var client = deployment.Current.CreateClient();
        (await List(client)).Single(p => p.Name == pose).Thumbnail.ShouldBeNull();
    }

    // --- Helpers --------------------------------------------------------------------------------

    /// <summary>The page sizes of the removed photos, kept before their removal to open their address afterwards.</summary>
    private readonly Dictionary<string, string> _removedPages = [];

    /// <summary>Bruno when the scenario made him a validator; otherwise Valentin, a validator of the set-up.</summary>
    private async Task<HttpClient> Manager()
    {
        if (people.IsKnown("Bruno")) return await people.SignedInClient("Bruno");
        if (!people.IsKnown("Valentin"))
        {
            (await people.Register("Valentin", People.DefaultEmail("Valentin"))).EnsureSuccessStatusCode();
            await roles.SetRole(People.DefaultEmail("Valentin"), RoleLabels.RoleCode("validateur"));
        }

        return await people.SignedInClient("Valentin");
    }

    private static async Task Added(HttpClient client, string pose, string file, string altText, string credit)
    {
        var response = await Send(client, await PoseIdOf(client, pose), TestPhotoFiles.From(file), altText, credit, rights: true);
        response.StatusCode.ShouldBe(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
    }

    private static Task<HttpResponseMessage> Add(HttpClient client, Guid pose, string file, string details)
    {
        var (altText, credit, rights) = Parse(details);
        return Send(client, pose, TestPhotoFiles.From(file), altText, credit, rights);
    }

    private static async Task<HttpResponseMessage> Send(HttpClient client, Guid pose, byte[] content, string? altText, string? credit, bool rights)
    {
        using var form = new MultipartFormDataContent();
        if (content.Length > 0) form.Add(new ByteArrayContent(content), "file", "photo.jpg");
        if (altText is not null) form.Add(new StringContent(altText), "altText");
        if (credit is not null) form.Add(new StringContent(credit), "credit");
        form.Add(new StringContent(rights ? "true" : "false"), "rightsConfirmed");
        return await client.PostAsync(new Uri($"/catalog/poses/{pose}/photos", UriKind.Relative), form);
    }

    /// <summary>The texts and the confirmation of an addition, from the end of the step (defaults otherwise).</summary>
    private static (string? AltText, string? Credit, bool Rights) Parse(string details)
    {
        string? altText = DefaultAltText;
        string? credit = DefaultCredit;
        var rights = true;
        var altTextGiven = System.Text.RegularExpressions.Regex.Match(details, "le texte alternatif «(.*?)»(?: et|$)");
        if (altTextGiven.Success) altText = Unquoted(altTextGiven.Groups[1].Value);
        var creditGiven = System.Text.RegularExpressions.Regex.Match(details, "le crédit «(.*?)»$");
        if (creditGiven.Success) credit = Unquoted(creditGiven.Groups[1].Value);
        if (System.Text.RegularExpressions.Regex.Match(details, @"un texte alternatif de (\d+) caractères") is { Success: true } longAlt)
            altText = new string('a', int.Parse(longAlt.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture));
        if (System.Text.RegularExpressions.Regex.Match(details, @"un crédit de (\d+) caractères") is { Success: true } longCredit)
            credit = new string('l', int.Parse(longCredit.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture));
        if (details.Contains("sans texte alternatif", StringComparison.Ordinal)) altText = null;
        if (details.Contains("un texte alternatif fait seulement d'espaces", StringComparison.Ordinal)) altText = "     ";
        if (details.Contains("sans crédit", StringComparison.Ordinal)) credit = null;
        if (details.Contains("sans cocher la case des droits", StringComparison.Ordinal)) rights = false;
        return (altText, credit, rights);
    }

    /// <summary>« Léa Martin » is written with a space on each side of the text inside the quotes.</summary>
    private static string Unquoted(string quoted) =>
        quoted.StartsWith(' ') && quoted.EndsWith(' ') && !quoted.StartsWith("  ", StringComparison.Ordinal) ? quoted[1..^1] : quoted;

    private static string[] Quoted(string list) =>
        [.. System.Text.RegularExpressions.Regex.Matches(list, "« ([^»]+) »").Select(m => m.Groups[1].Value)];

    private async Task Correct(string person, string altText, string field, string value)
    {
        var client = await people.SignedInClient(person);
        var (poseId, photo) = await PhotoOfAnyPose(client, altText);
        var body = field == "le texte alternatif"
            ? new { altText = (string?)value, credit = photo.Credit }
            : new { altText = photo.AltText, credit = value };
        responses.Last = await client.PutAsJsonAsync(new Uri($"/catalog/poses/{poseId}/photos/{photo.Id}", UriKind.Relative), body);
    }

    private async Task<IReadOnlyList<PhotoItem>> Photos(string pose)
    {
        if (responses.Last is { IsSuccessStatusCode: false } refused && refused.StatusCode != HttpStatusCode.NotFound)
            refused.IsSuccessStatusCode.ShouldBeTrue(await refused.Content.ReadAsStringAsync());
        using var client = deployment.Current.CreateClient();
        var page = await client.GetFromJsonAsync<PosePage>(new Uri($"/catalog/poses/{await PoseIdOf(client, pose)}", UriKind.Relative));
        return page!.Photos;
    }

    private async Task<(Guid Pose, PhotoItem Photo)> PhotoOf(HttpClient client, string pose, string altText, bool mayBeRemoved = false)
    {
        var poseId = await PoseIdOf(client, pose);
        var page = await client.GetFromJsonAsync<PosePage>(new Uri($"/catalog/poses/{poseId}", UriKind.Relative));
        var photo = page!.Photos.SingleOrDefault(p => p.AltText == altText);
        if (photo is not null)
        {
            _removedPages[altText] = photo.Sources.Page;
            _removedIds[altText] = photo;
            return (poseId, photo);
        }

        if (mayBeRemoved && _removedIds.TryGetValue(altText, out var removed)) return (poseId, removed);
        throw new InvalidOperationException($"No photo « {altText} » on the pose {pose}.");
    }

    private readonly Dictionary<string, PhotoItem> _removedIds = [];

    private static async Task<(Guid Pose, PhotoItem Photo)> PhotoOfAnyPose(HttpClient client, string altText)
    {
        foreach (var pose in await List(client))
        {
            var page = await client.GetFromJsonAsync<PosePage>(new Uri($"/catalog/poses/{pose.Id}", UriKind.Relative));
            if (page!.Photos.SingleOrDefault(p => p.AltText == altText) is { } photo) return (pose.Id, photo);
        }

        throw new InvalidOperationException($"No photo « {altText} » in the catalog.");
    }

    private static async Task<IReadOnlyList<PoseItem>> List(HttpClient client) =>
        (await client.GetFromJsonAsync<PoseList>(new Uri("/catalog/poses", UriKind.Relative)))!.Poses;

    private static async Task<Guid> PoseIdOf(HttpClient client, string pose) => (await List(client)).Single(p => p.Name == pose).Id;

    private sealed record PoseList(IReadOnlyList<PoseItem> Poses);

    private sealed record PoseItem(Guid Id, string Name, string? Thumbnail);

    private sealed record PosePage(Guid Id, string Name, IReadOnlyList<PhotoItem> Photos);

    private sealed record PhotoItem(Guid Id, string? AltText, string Credit, int Width, int Height, PhotoSourcesItem Sources);

    private sealed record PhotoSourcesItem(string Thumbnail, string Page, string Enlarged)
    {
        public IEnumerable<string> All => [Thumbnail, Page, Enlarged];
    }
}
