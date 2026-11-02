using System.Net;
using System.Net.Http.Json;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Identity;

[Binding]
public sealed class AccountSteps(People people)
{
    private const string SomeOne = "une personne";

    private HttpResponseMessage? _lastResponse;

    [Given("{word} a un compte avec l'adresse {string}")]
    public async Task GivenSomeoneHasAnAccount(string name, string email) =>
        (await people.Register(name, email)).EnsureSuccessStatusCode();

    [Given("{word} a un compte avec l'adresse {string} et le mot de passe {string}")]
    public async Task GivenSomeoneHasAnAccountWithPassword(string name, string email, string password) =>
        (await people.Register(name, email, password)).EnsureSuccessStatusCode();

    [When("{word} s'inscrit avec l'adresse {string}")]
    public async Task WhenSomeoneRegisters(string name, string email) =>
        (await people.Register(name, email)).EnsureSuccessStatusCode();

    [When("une personne s'inscrit avec l'adresse {string}")]
    public async Task WhenAPersonRegisters(string email) =>
        _lastResponse = await people.Register(SomeOne, email);

    [When("{word} se connecte avec l'adresse {string} et le mot de passe {string}")]
    public async Task WhenSomeoneSignsIn(string name, string email, string password) =>
        _lastResponse = await people.SignIn(name, email, password);

    [When("une personne se connecte avec l'adresse {string} et le mot de passe {string}")]
    public async Task WhenAPersonSignsIn(string email, string password) =>
        _lastResponse = await people.SignIn(SomeOne, email, password);

    [Then(@"^(\w+) est connectée?$")]
    public async Task ThenSomeoneIsSignedIn(string name)
    {
        _lastResponse.ShouldNotBeNull().StatusCode.ShouldBe(HttpStatusCode.OK);
        (await MyAccount(name)).Email.ShouldBe(people[name].Email);
    }

    [Then("la connexion est refusée car l'adresse e-mail ou le mot de passe est incorrect")]
    public void ThenTheSignInIsRefused() =>
        // Same answer whether the address is unknown or the password wrong (no account enumeration).
        _lastResponse.ShouldNotBeNull().StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

    [Then("l'inscription est refusée car l'adresse e-mail sert déjà à un compte")]
    public async Task ThenTheRegistrationIsRefusedForADuplicateEmail()
    {
        _lastResponse.ShouldNotBeNull().StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await _lastResponse.Content.ReadAsStringAsync()).ShouldContain("DuplicateEmail");
    }

    [Then("{word} a pour seul rôle utilisateur")]
    public async Task ThenTheOnlyRoleIsUser(string name) =>
        (await MyAccount(name)).Role.ShouldBe("user");

    private async Task<MyAccountResponse> MyAccount(string name)
    {
        var client = await people.SignedInClient(name);
        var response = await client.GetAsync(new Uri("/me", UriKind.Relative));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<MyAccountResponse>())!;
    }

    // Black-box view of the HTTP contract.
    private sealed record MyAccountResponse(string Email, string Role, IReadOnlyList<string> Capabilities);
}
