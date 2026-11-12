using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace AcroFunJam.Specs.Support.Identity;

/// <summary>
/// The people of the scenario (Alice, Paul…), their credentials and their signed-in client. The access token of each is
/// remembered with its period of validity on the scenario clock: a step that moves the clock (« Alice a proposé le
/// 2026-11-03… ») may leave it expired, or not issued yet, and the person then signs in again.
/// </summary>
public sealed class People(Deployment deployment, ScenarioClock clock) : IDisposable
{
    public const string DefaultPassword = "Throne-Bird-2026";

    private readonly Dictionary<string, Person> _people = new(StringComparer.Ordinal);

    private readonly Dictionary<string, (DateTimeOffset IssuedAt, DateTimeOffset ExpiresAt)> _accessTokens = new(StringComparer.Ordinal);

    public Person this[string name] => _people[name];

    public bool IsKnown(string name) => _people.ContainsKey(name);

    /// <summary>"chloe@example.org" for Chloé: the identity library only accepts ASCII user names.</summary>
    public static string DefaultEmail(string name) => $"{WithoutAccents(name).ToLowerInvariant()}@example.org";

    private static string WithoutAccents(string text) =>
        string.Concat(text.Normalize(System.Text.NormalizationForm.FormD)
            .Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark));

    public async Task<HttpResponseMessage> Register(string name, string email, string password = DefaultPassword)
    {
        var client = deployment.Current.CreateClient();
        var response = await client.PostAsJsonAsync(new Uri("/identity/register", UriKind.Relative), new { email, password });
        _people[name] = new Person(name, email, password, client);
        return response;
    }

    public async Task<HttpResponseMessage> SignIn(string name, string email, string password)
    {
        var client = _people.TryGetValue(name, out var known) ? known.Client : deployment.Current.CreateClient();
        var response = await client.PostAsJsonAsync(new Uri("/identity/login", UriKind.Relative), new { email, password });
        if (response.IsSuccessStatusCode)
        {
            var token = await response.Content.ReadFromJsonAsync<AccessTokenResponse>();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token!.AccessToken);
            var issuedAt = clock.GetUtcNow();
            _accessTokens[name] = (issuedAt, issuedAt.AddSeconds(token.ExpiresIn));
        }

        _people[name] = new Person(name, email, password, client);
        return response;
    }

    /// <summary>
    /// The signed-in client of a person, signing in first if needed: never signed in, or holding an access token that is not
    /// valid at the current instant of the scenario clock.
    /// </summary>
    public async Task<HttpClient> SignedInClient(string name)
    {
        var person = _people[name];
        if (person.Client.DefaultRequestHeaders.Authorization is null || !HoldsAValidAccessToken(name))
        {
            (await SignIn(name, person.Email, person.Password)).EnsureSuccessStatusCode();
        }

        return _people[name].Client;
    }

    private bool HoldsAValidAccessToken(string name)
    {
        var now = clock.GetUtcNow();
        return _accessTokens.TryGetValue(name, out var token) && token.IssuedAt <= now && now < token.ExpiresAt;
    }

    public void Dispose()
    {
        foreach (var person in _people.Values) person.Client.Dispose();
    }

    private sealed record AccessTokenResponse(string AccessToken, long ExpiresIn);
}

public sealed record Person(string Name, string Email, string Password, HttpClient Client);
