using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Application.Catalog.PrepareNextVideo;
using AcroFunJam.Application.Common;
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
/// Story 12: the videos of the transitions (ADR 0041). Added through POST /catalog/transitions/{id}/videos (multipart), managed
/// through PUT and DELETE, listed for the managers by GET /catalog/transitions/{id}/videos, presented in each transition of the
/// page of a pose, served by GET /catalog/videos/{id}/{video|poster}. The worker is not started: « AcroFunJam a fini de préparer »
/// runs the use case PrepareNextVideo, and so does a « Soit … a ajouté … une vidéo », unless « encore en préparation ». A
/// transition is found by its name and its poses, a video by its caption.
/// </summary>
[Binding]
public sealed partial class TransitionVideoSteps(
    People people, RoleSetter roles, Deployment deployment, ScenarioResponses responses, ScenarioClock clock, ConsultedPosePage consulted)
{
    private const string File = "(" + TestVideoFiles.Pattern + ")";
    private const string Transition = @"la transition ""([^""]+)"" de ""([^""]+)"" vers ""([^""]+)""";

    /// <summary>« , avec la légende « … » et le crédit « … » », « , sans crédit », « , encore en préparation »…, or nothing.</summary>
    private const string Details = "(.*)";

    private const string DefaultCaption = "Vidéo de test";
    private const string DefaultCredit = "Léa Martin";
    private const string StillInPreparation = ", encore en préparation";

    // --- Set-up ---------------------------------------------------------------------------------

    [Given(@"^(\w+) a ajouté à " + Transition + " " + File + Details + "$")]
    public async Task GivenSomeoneHasAddedAVideo(string person, string transition, string from, string to, string file, string details)
    {
        var preparedAtOnce = !details.EndsWith(StillInPreparation, StringComparison.Ordinal);
        await WhenSomeoneAddsAVideo(person, transition, from, to, file, preparedAtOnce ? details : details[..^StillInPreparation.Length]);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.Accepted, await responses.Last.Content.ReadAsStringAsync());
        if (preparedAtOnce) await PrepareAll();
    }

    [Given(@"^" + Transition + @" a déjà 3 vidéos$")]
    public Task GivenTheTransitionHasAlreadyThreeVideos(string transition, string from, string to) =>
        GivenTheTransitionHasAlreadyThreeVideosAmong(transition, from, to, null);

    [Given(@"^" + Transition + @" a déjà 3 vidéos, dont « ([^»]+) »$")]
    public async Task GivenTheTransitionHasAlreadyThreeVideosAmong(string transition, string from, string to, string? among)
    {
        var client = await Manager();
        foreach (var caption in new[] { among ?? "Vidéo 1", "Vidéo 2", "Vidéo 3" })
            await Added(client, transition, from, to, "une vidéo MP4 de 12 s", caption, DefaultCredit, null);
        await PrepareAll();
    }

    [Given(@"^" + Transition + @" a déjà 2 vidéos prêtes et 1 vidéo encore en préparation$")]
    public async Task GivenTheTransitionHasTwoReadyVideosAndOneInPreparation(string transition, string from, string to)
    {
        var client = await Manager();
        await Added(client, transition, from, to, "une vidéo MP4 de 12 s", "Vidéo 1", DefaultCredit, null);
        await Added(client, transition, from, to, "une vidéo MP4 de 12 s", "Vidéo 2", DefaultCredit, null);
        await PrepareAll();
        await Added(client, transition, from, to, "une vidéo MP4 de 12 s", "Vidéo 3", DefaultCredit, null);
    }

    [Given(@"^" + Transition + @" a pour vidéos, dans cet ordre :$")]
    public async Task GivenTheTransitionHasTheVideos(string transition, string from, string to, DataTable videos)
    {
        var client = await Manager();
        foreach (var row in videos.Rows)
        {
            var description = videos.Header.Contains("description") && !string.IsNullOrWhiteSpace(row["description"]) ? row["description"] : null;
            await Added(client, transition, from, to, row["fichier"], row["légende"], row["crédit"], description);
        }

        await PrepareAll();
    }

    [Given(@"^(\w+) a retiré de " + Transition + " la vidéo « ([^»]+) »$")]
    public async Task GivenSomeoneHasRemovedAVideo(string person, string transition, string from, string to, string caption)
    {
        await WhenSomeoneRemovesAVideo(person, transition, from, to, caption);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.NoContent, await responses.Last.Content.ReadAsStringAsync());
    }

    [Given(@"^(\w+) a changé (la légende|le crédit|la description) de la vidéo « ([^»]+) » de " + Transition + " en « ([^»]+) »$")]
    public async Task GivenSomeoneHasCorrectedAVideo(string person, string field, string caption, string transition, string from, string to, string value)
    {
        await Correct(person, transition, from, to, caption, field, value);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.OK, await responses.Last.Content.ReadAsStringAsync());
    }

    [Given(@"^(\w+) a changé la description de la vidéo « ([^»]+) » de " + Transition + " en une description vide$")]
    public async Task GivenSomeoneHasEmptiedTheDescription(string person, string caption, string transition, string from, string to)
    {
        await Correct(person, transition, from, to, caption, "la description", string.Empty);
        responses.Last!.StatusCode.ShouldBe(HttpStatusCode.OK, await responses.Last.Content.ReadAsStringAsync());
    }

    [Given(@"^AcroFunJam a fini de préparer la vidéo « ([^»]+) »$")]
    public async Task GivenAcroFunJamHasPreparedTheVideo(string caption)
    {
        await PrepareAll();
        (await AnyVideo(caption)).Preparation.ShouldBe("ready");
    }

    [Given(@"^AcroFunJam n'a pas pu préparer la vidéo « ([^»]+) »$")]
    public async Task GivenAcroFunJamCouldNotPrepareTheVideo(string caption)
    {
        await PrepareAll();
        (await AnyVideo(caption)).Preparation.ShouldBe("failed");
    }

    // --- Adding, removing, correcting -----------------------------------------------------------

    [When(@"^(\w+) ajoute le (\d{4}-\d{2}-\d{2}) à " + Transition + " " + File + Details + "$")]
    public Task WhenSomeoneAddsAVideoOn(string person, string day, string transition, string from, string to, string file, string details)
    {
        clock.SetUtcNow(ScenarioClock.Parse(day));
        return WhenSomeoneAddsAVideo(person, transition, from, to, file, details);
    }

    [When(@"^(\w+) ajoute à " + Transition + " " + File + Details + "$")]
    public async Task WhenSomeoneAddsAVideo(string person, string transition, string from, string to, string file, string details)
    {
        var client = await people.SignedInClient(person);
        responses.Last = await Add(client, await TransitionIdOf(client, transition, from, to), file, details);
    }

    [When(@"^un visiteur ajoute à " + Transition + " " + File + "$")]
    public async Task WhenAVisitorAddsAVideo(string transition, string from, string to, string file)
    {
        using var visitor = deployment.Current.CreateClient();
        responses.Last = await Add(visitor, await TransitionIdOf(visitor, transition, from, to), file, string.Empty);
    }

    [When(@"^(\w+) ajoute à une transition qui n'existe pas dans le catalogue " + File + "$")]
    public async Task WhenSomeoneAddsAVideoToAnUnknownTransition(string person, string file) =>
        responses.Last = await Add(await people.SignedInClient(person), Guid.NewGuid(), file, string.Empty);

    [When(@"^(\w+) retire de " + Transition + " la vidéo « ([^»]+) »$")]
    public async Task WhenSomeoneRemovesAVideo(string person, string transition, string from, string to, string caption)
    {
        var client = await people.SignedInClient(person);
        var transitionId = await TransitionIdOf(client, transition, from, to);
        var video = await VideoOf(transitionId, caption, mayBeRemoved: true);
        responses.Last = await client.DeleteAsync(new Uri($"/catalog/transitions/{transitionId}/videos/{video.Id}", UriKind.Relative));
    }

    [When(@"^(\w+) change la légende de la vidéo « ([^»]+) » de " + Transition + " en une légende faite seulement d'espaces$")]
    public Task WhenSomeoneChangesTheCaptionToSpaces(string person, string caption, string transition, string from, string to) =>
        Correct(person, transition, from, to, caption, "la légende", "     ");

    [When(@"^un visiteur ouvre l'adresse (de la vidéo|de l'affiche de la vidéo) retirée « ([^»]+) »$")]
    public async Task WhenAVisitorOpensTheAddressOfARemovedVideo(string element, string caption)
    {
        var sources = _removed[caption].Sources.ShouldNotBeNull();
        using var visitor = deployment.Current.CreateClient();
        responses.Last = await visitor.GetAsync(new Uri(element == "de la vidéo" ? sources.Video : sources.Poster, UriKind.Relative));
    }

    // --- Outcome --------------------------------------------------------------------------------

    [Then("la vidéo est introuvable")]
    public void ThenTheVideoIsNotFound() => responses.Last.ShouldNotBeNull().StatusCode.ShouldBe(HttpStatusCode.NotFound);

    [Then(@"^" + Transition + @" a (\d+) vidéos?$")]
    public async Task ThenTheTransitionHasSoManyVideos(string transition, string from, string to, int count) =>
        (await Videos(transition, from, to)).Count.ShouldBe(count);

    [Then(@"^" + Transition + @" a (\d+) vidéos?, (?:dont )?« ([^»]+) »$")]
    public async Task ThenTheTransitionHasSoManyVideosAmong(string transition, string from, string to, int count, string caption)
    {
        var videos = await Videos(transition, from, to);
        videos.Count.ShouldBe(count);
        videos.Select(v => v.Caption).ShouldContain(caption);
    }

    [Then(@"^" + Transition + @" a la vidéo « ([^»]+) »$")]
    public async Task ThenTheTransitionHasTheVideo(string transition, string from, string to, string caption) =>
        (await Videos(transition, from, to)).Select(v => v.Caption).ShouldContain(caption);

    [Then(@"^la vidéo de " + Transition + " est créditée « ([^»]+) »$")]
    public async Task ThenTheVideoIsCredited(string transition, string from, string to, string credit) =>
        (await Videos(transition, from, to)).Single().Credit.ShouldBe(credit);

    [Then(@"^la vidéo « ([^»]+) » de " + Transition + " a pour description « ([^»]+) »$")]
    public async Task ThenTheVideoHasTheDescription(string caption, string transition, string from, string to, string description) =>
        (await Videos(transition, from, to)).Single(v => v.Caption == caption).Description.ShouldBe(description);

    [Then(@"^la vidéo « ([^»]+) » de " + Transition + " n'a pas de description$")]
    public async Task ThenTheVideoHasNoDescription(string caption, string transition, string from, string to) =>
        (await Videos(transition, from, to)).Single(v => v.Caption == caption).Description.ShouldBeNull();

    [Then(@"^la vidéo de " + Transition + @" garde la confirmation des droits donnée par (\w+) le (\d{4}-\d{2}-\d{2})$")]
    public async Task ThenTheVideoKeepsTheConfirmation(string transition, string from, string to, string person, string day)
    {
        using var client = deployment.Current.CreateClient();
        var transitionId = await TransitionIdOf(client, transition, from, to);
        using var scope = deployment.Current.Services.CreateScope();
        var account = await scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>().FindByEmailAsync(people[person].Email);
        var videos = await scope.ServiceProvider.GetRequiredService<ITransitionVideosRepository>().GetFor(new TransitionId(transitionId), CancellationToken.None);
        var rights = videos.InAdditionOrder().Single().Rights;
        rights.ConfirmedBy.Value.ShouldBe(account.ShouldNotBeNull().Id);
        ScenarioClock.DayOf(rights.ConfirmedAt).ShouldBe(day);
    }

    [Then(@"^la vidéo présentée de " + Transition + " (n'a pas de son|ne contient aucune métadonnée)$")]
    public async Task ThenThePresentedVideoHasNothingButTheImage(string transition, string from, string to, string _)
    {
        var video = await PresentedVideo(transition, from, to);
        using var visitor = deployment.Current.CreateClient();
        var content = await visitor.GetByteArrayAsync(new Uri(video.Sources!.Video, UriKind.Relative));
        Encoding.ASCII.GetString(content).ShouldBe(TestVideoFiles.PreparedContent);
    }

    [Then(@"^la vidéo présentée de " + Transition + " est en portrait$")]
    public async Task ThenThePresentedVideoIsPortrait(string transition, string from, string to)
    {
        var video = await PresentedVideo(transition, from, to);
        video.Height.ShouldBeGreaterThan(video.Width);
    }

    [Then(@"^la vidéo présentée de " + Transition + @" mesure (\d+)×(\d+)$")]
    public async Task ThenThePresentedVideoMeasures(string transition, string from, string to, int width, int height)
    {
        var video = await PresentedVideo(transition, from, to);
        (video.Width, video.Height).ShouldBe((width, height));
    }

    [Then(@"^la vidéo présentée « ([^»]+) » a pour affiche sa première image$")]
    public async Task ThenThePosterIsTheFirstImage(string caption)
    {
        await PrepareAll();
        var video = await AnyVideo(caption);
        using var visitor = deployment.Current.CreateClient();
        var response = await visitor.GetAsync(new Uri(video.Sources.ShouldNotBeNull().Poster, UriKind.Relative));
        response.Content.Headers.ContentType?.MediaType.ShouldBe("image/webp");
        Encoding.ASCII.GetString(await response.Content.ReadAsByteArrayAsync()).ShouldBe(TestVideoFiles.PosterContent);
    }

    // --- Presenting on the page of a pose -------------------------------------------------------

    [Then(@"^la transition ""([^""]+)"" (depuis|vers) la pose ""([^""]+)"" présente exactement les vidéos :$")]
    public async Task ThenTheTransitionPresentsExactlyTheVideos(string transition, string direction, string pose, DataTable expected) =>
        (await Presented(transition, direction, pose)).Select(v => (v.Caption, v.Credit))
            .ShouldBe(expected.Rows.Select(r => (r["légende"], r["crédit"])));

    [Then(@"^la transition ""([^""]+)"" (depuis|vers) la pose ""([^""]+)"" ne présente aucune vidéo$")]
    public async Task ThenTheTransitionPresentsNoVideo(string transition, string direction, string pose) =>
        (await Presented(transition, direction, pose)).ShouldBeEmpty();

    [Then(@"^« la transition de (\w+) vers (\w+) » ne présente aucune vidéo$")]
    public async Task ThenTheUnnamedTransitionPresentsNoVideo(string from, string to) =>
        (await Page()).TransitionsFrom.Single(t => t.Name is null && t.OtherPose.Name == to).Videos.ShouldBeEmpty();

    [Then(@"^la transition ""([^""]+)"" (depuis|vers) la pose ""([^""]+)"" présente la vidéo « ([^»]+) »$")]
    public async Task ThenTheTransitionPresentsTheVideo(string transition, string direction, string pose, string caption) =>
        (await Presented(transition, direction, pose)).Select(v => v.Caption).ShouldContain(caption);

    [Then(@"^la transition ""([^""]+)"" (depuis|vers) la pose ""([^""]+)"" présente les vidéos dans cet ordre : (« .+ »)$")]
    public async Task ThenTheVideosArePresentedInOrder(string transition, string direction, string pose, string captions) =>
        (await Presented(transition, direction, pose)).Select(v => v.Caption).ShouldBe(Quoted(captions));

    [Then(@"^la vidéo « ([^»]+) » de la transition ""([^""]+)"" (depuis|vers) la pose ""([^""]+)"" est présentée à (\w+) comme (en préparation|impossible à préparer)$")]
    public async Task ThenTheVideoIsPresentedAs(string caption, string transition, string direction, string pose, string person, string state)
    {
        var video = (await Presented(transition, direction, pose)).Single(v => v.Caption == caption);
        video.Preparation.ShouldBe(state == "en préparation" ? "in-preparation" : "failed");
        video.Sources.ShouldBeNull();
    }

    [Then(@"^la vidéo « ([^»]+) » de la transition ""([^""]+)"" (depuis|vers) la pose ""([^""]+)"" a pour description « ([^»]+) »$")]
    public async Task ThenThePresentedVideoHasTheDescription(string caption, string transition, string direction, string pose, string description) =>
        (await Presented(transition, direction, pose)).Single(v => v.Caption == caption).Description.ShouldBe(description);

    [Then(@"^la vidéo « ([^»]+) » de la transition ""([^""]+)"" (depuis|vers) la pose ""([^""]+)"" n'a pas de description$")]
    public async Task ThenThePresentedVideoHasNoDescription(string caption, string transition, string direction, string pose) =>
        (await Presented(transition, direction, pose)).Single(v => v.Caption == caption).Description.ShouldBeNull();

    [Then(@"^la vidéo « ([^»]+) » de la transition ""([^""]+)"" (depuis|vers) la pose ""([^""]+)"" est créditée « ([^»]+) »$")]
    public async Task ThenThePresentedVideoIsCredited(string caption, string transition, string direction, string pose, string credit) =>
        (await Presented(transition, direction, pose)).Single(v => v.Caption == caption).Credit.ShouldBe(credit);

    // --- Helpers --------------------------------------------------------------------------------

    /// <summary>The videos as they were before their removal, to open their address afterwards or remove them again.</summary>
    private readonly Dictionary<string, VideoItem> _removed = [];

    /// <summary>Runs the worker's use case until no video waits (ADR 0041: the worker is not started in the scenarios).</summary>
    private async Task PrepareAll()
    {
        for (var handled = true; handled;)
        {
            using var scope = deployment.Current.Services.CreateScope();
            var prepared = await scope.ServiceProvider.GetRequiredService<ICommandHandler<PrepareNextVideo, bool>>()
                .Handle(new PrepareNextVideo(), CancellationToken.None);
            handled = prepared.Value;
        }
    }

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

    private static async Task Added(HttpClient client, string transition, string from, string to, string file, string caption, string credit, string? description)
    {
        var response = await Send(client, await TransitionIdOf(client, transition, from, to), file, caption, credit, description, rights: true);
        response.StatusCode.ShouldBe(HttpStatusCode.Accepted, await response.Content.ReadAsStringAsync());
    }

    private static Task<HttpResponseMessage> Add(HttpClient client, Guid transition, string file, string details)
    {
        var (caption, credit, description, rights) = Parse(details);
        return Send(client, transition, file, caption, credit, description, rights);
    }

    private static async Task<HttpResponseMessage> Send(
        HttpClient client, Guid transition, string file, string? caption, string? credit, string? description, bool rights)
    {
        using var form = new MultipartFormDataContent();
        if (caption is not null) form.Add(new StringContent(caption), "caption");
        if (credit is not null) form.Add(new StringContent(credit), "credit");
        if (description is not null) form.Add(new StringContent(description), "description");
        form.Add(new StringContent(rights ? "true" : "false"), "rightsConfirmed");
        // The file is the last part (ADR 0041): the texts are read before it is streamed to the disk.
        if (TestVideoFiles.From(file) is { } content) form.Add(content, "file", "pop-to-bird.mp4");
        return await client.PostAsync(new Uri($"/catalog/transitions/{transition}/videos", UriKind.Relative), form);
    }

    /// <summary>The texts and the confirmation of an addition, from the end of the step (defaults otherwise).</summary>
    private static (string? Caption, string? Credit, string? Description, bool Rights) Parse(string details)
    {
        string? caption = DefaultCaption;
        string? credit = DefaultCredit;
        string? description = null;
        var rights = true;
        if (CaptionGiven().Match(details) is { Success: true } givenCaption) caption = Unquoted(givenCaption.Groups[1].Value);
        if (CreditGiven().Match(details) is { Success: true } givenCredit) credit = Unquoted(givenCredit.Groups[1].Value);
        if (DescriptionGiven().Match(details) is { Success: true } givenDescription) description = Unquoted(givenDescription.Groups[1].Value);
        if (LongText().Match(details) is { Success: true } longText)
        {
            var text = new string('l', int.Parse(longText.Groups[2].Value, CultureInfo.InvariantCulture));
            switch (longText.Groups[1].Value)
            {
                case "légende": caption = text; break;
                case "crédit": credit = text; break;
                default: description = text; break;
            }
        }

        if (details.Contains("sans légende", StringComparison.Ordinal)) caption = null;
        if (details.Contains("une légende faite seulement d'espaces", StringComparison.Ordinal)) caption = "     ";
        if (details.Contains("sans crédit", StringComparison.Ordinal)) credit = null;
        if (details.Contains("une description faite seulement d'espaces", StringComparison.Ordinal)) description = "     ";
        if (details.Contains("sans cocher la case des droits", StringComparison.Ordinal)) rights = false;
        return (caption, credit, description, rights);
    }

    [GeneratedRegex("la légende «(.*?)»(?: et|,|$)")]
    private static partial Regex CaptionGiven();

    [GeneratedRegex("le crédit «(.*?)»(?: et|,|$)")]
    private static partial Regex CreditGiven();

    [GeneratedRegex("la description «(.*?)»(?: et|,|$)")]
    private static partial Regex DescriptionGiven();

    [GeneratedRegex(@"une? (légende|crédit|description) de (\d+) caractères")]
    private static partial Regex LongText();

    /// <summary>« Léa Martin » is written with a space on each side of the text inside the quotes.</summary>
    private static string Unquoted(string quoted) =>
        quoted.StartsWith(' ') && quoted.EndsWith(' ') && !quoted.StartsWith("  ", StringComparison.Ordinal) ? quoted[1..^1] : quoted;

    private static string[] Quoted(string list) => [.. Regex.Matches(list, "« ([^»]+) »").Select(m => m.Groups[1].Value)];

    private async Task Correct(string person, string transition, string from, string to, string caption, string field, string value)
    {
        var client = await people.SignedInClient(person);
        var transitionId = await TransitionIdOf(client, transition, from, to);
        var video = await VideoOf(transitionId, caption);
        var body = new
        {
            caption = field == "la légende" ? value : video.Caption,
            credit = field == "le crédit" ? value : video.Credit,
            description = field == "la description" ? value : video.Description,
        };
        responses.Last = await client.PutAsJsonAsync(new Uri($"/catalog/transitions/{transitionId}/videos/{video.Id}", UriKind.Relative), body);
    }

    /// <summary>The videos of a transition, whatever their preparation, as a manager lists them.</summary>
    private async Task<IReadOnlyList<VideoItem>> Videos(string transition, string from, string to)
    {
        var client = await Manager();
        return await VideosOf(client, await TransitionIdOf(client, transition, from, to));
    }

    private static async Task<IReadOnlyList<VideoItem>> VideosOf(HttpClient manager, Guid transition)
    {
        var response = await manager.GetAsync(new Uri($"/catalog/transitions/{transition}/videos", UriKind.Relative));
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        return JsonSerializer.Deserialize<VideoList>(body, JsonSerializerOptions.Web)!.Videos;
    }

    /// <summary>The single video of a transition once prepared: « la vidéo présentée » is the prepared video.</summary>
    private async Task<VideoItem> PresentedVideo(string transition, string from, string to)
    {
        if (responses.Last is { IsSuccessStatusCode: false } refused) refused.IsSuccessStatusCode.ShouldBeTrue(await refused.Content.ReadAsStringAsync());
        await PrepareAll();
        var video = (await Videos(transition, from, to)).Single();
        video.Preparation.ShouldBe("ready");
        return video;
    }

    private async Task<VideoItem> VideoOf(Guid transition, string caption, bool mayBeRemoved = false)
    {
        var video = (await VideosOf(await Manager(), transition)).SingleOrDefault(v => v.Caption == caption);
        if (video is not null)
        {
            _removed[caption] = video;
            return video;
        }

        if (mayBeRemoved && _removed.TryGetValue(caption, out var removed)) return removed;
        throw new InvalidOperationException($"No video « {caption} » on the transition {transition}.");
    }

    /// <summary>A video of any transition, found by its caption.</summary>
    private async Task<VideoItem> AnyVideo(string caption)
    {
        var client = await Manager();
        foreach (var pose in (await client.GetFromJsonAsync<PoseList>(new Uri("/catalog/poses", UriKind.Relative)))!.Poses)
        {
            var page = (await client.GetFromJsonAsync<PosePage>(new Uri($"/catalog/poses/{pose.Id}", UriKind.Relative)))!;
            foreach (var transition in page.TransitionsFrom)
                if ((await VideosOf(client, transition.Id)).SingleOrDefault(v => v.Caption == caption) is { } video) return video;
        }

        throw new InvalidOperationException($"No video « {caption} » in the catalog.");
    }

    private async Task<PosePage> Page()
    {
        var response = consulted.Response.ShouldNotBeNull();
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.ShouldBe(HttpStatusCode.OK, body);
        response.Headers.CacheControl?.Private.ShouldBeTrue();
        return JsonSerializer.Deserialize<PosePage>(body, JsonSerializerOptions.Web)!;
    }

    /// <summary>The videos of a transition as the last consultation of the page of a pose presented them.</summary>
    private async Task<IReadOnlyList<VideoItem>> Presented(string transition, string direction, string pose)
    {
        var page = await Page();
        page.Name.ShouldBe(pose);
        return (direction == "depuis" ? page.TransitionsFrom : page.TransitionsTo).Single(t => t.Name == transition).Videos;
    }

    private static async Task<Guid> TransitionIdOf(HttpClient client, string transition, string from, string to)
    {
        var poses = (await client.GetFromJsonAsync<PoseList>(new Uri("/catalog/poses", UriKind.Relative)))!.Poses;
        var page = (await client.GetFromJsonAsync<PosePage>(new Uri($"/catalog/poses/{poses.Single(p => p.Name == from).Id}", UriKind.Relative)))!;
        return page.TransitionsFrom.Single(t => t.Name == transition && t.OtherPose.Name == to).Id;
    }

    // Black-box view of the HTTP contract (deliberately not the Api types).
    private sealed record PoseList(IReadOnlyList<PoseItem> Poses);

    private sealed record PoseItem(Guid Id, string Name);

    private sealed record PosePage(Guid Id, string Name, IReadOnlyList<TransitionItem> TransitionsFrom, IReadOnlyList<TransitionItem> TransitionsTo);

    private sealed record OtherPose(Guid Id, string Name);

    private sealed record TransitionItem(Guid Id, OtherPose OtherPose, string? Name, IReadOnlyList<VideoItem> Videos);

    private sealed record VideoList(IReadOnlyList<VideoItem> Videos);

    private sealed record VideoItem(
        Guid Id, string Caption, string Credit, string? Description, int Width, int Height, long DurationMs, string Preparation, VideoSources? Sources);

    private sealed record VideoSources(string Video, string Poster);
}
