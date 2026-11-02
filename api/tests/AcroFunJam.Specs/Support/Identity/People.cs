using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace AcroFunJam.Specs.Support.Identity;

/// <summary>The people of the scenario (Alice, Paul…), their credentials and their signed-in client.</summary>
public sealed class People(Deployment deployment) : IDisposable
{
    public const string DefaultPassword = "Throne-Bird-2026";

    private readonly Dictionary<string, Person> _people = new(StringComparer.Ordinal);

    public Person this[string name] => _people[name];

    public static string DefaultEmail(string name) => $"{name.ToLowerInvariant()}@example.org";

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
        }

        _people[name] = new Person(name, email, password, client);
        return response;
    }

    /// <summary>The signed-in client of a person, signing in first if needed.</summary>
    public async Task<HttpClient> SignedInClient(string name)
    {
        var person = _people[name];
        if (person.Client.DefaultRequestHeaders.Authorization is null)
        {
            (await SignIn(name, person.Email, person.Password)).EnsureSuccessStatusCode();
        }

        return _people[name].Client;
    }

    public void Dispose()
    {
        foreach (var person in _people.Values) person.Client.Dispose();
    }

    private sealed record AccessTokenResponse(string AccessToken);
}

public sealed record Person(string Name, string Email, string Password, HttpClient Client);
