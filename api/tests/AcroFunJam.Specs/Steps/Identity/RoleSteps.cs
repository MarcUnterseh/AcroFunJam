using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AcroFunJam.Specs.Support.Identity;
using Reqnroll;

namespace AcroFunJam.Specs.Steps.Identity;

[Binding]
public sealed class RoleSteps(People people, RoleSetter roles, Deployment deployment)
{
    private const string Roles = "utilisateur|validateur|validatrice|administrateur|administratrice";

    private MyAccountResponse? _consulted;
    private HttpResponseMessage? _lastResponse;

    // --- States -------------------------------------------------------------------------------

    [Given(@"^(\w+) est (" + Roles + ")$")]
    public Task GivenSomeoneHasTheRole(string name, string role) =>
        GivenSomeoneHasTheRoleWithEmail(name, role, People.DefaultEmail(name));

    [Given(@"^(\w+) est (" + Roles + @") avec l'adresse ""([^""]+)""$")]
    public async Task GivenSomeoneHasTheRoleWithEmail(string name, string role, string email)
    {
        (await people.Register(name, email)).EnsureSuccessStatusCode();
        await roles.SetRole(email, RoleLabels.RoleCode(role));
    }

    [Given(@"^(\w+) est le seul administrateur, avec l'adresse ""([^""]+)""$")]
    public async Task GivenSomeoneIsTheOnlyAdministrator(string name, string email)
    {
        await GivenSomeoneHasTheRoleWithEmail(name, "administrateur", email);
        (await roles.CountAdministrators()).ShouldBe(1);
    }

    [Given("aucun administrateur n'existe")]
    public async Task GivenNoAdministratorExists() => (await roles.CountAdministrators()).ShouldBe(0);

    [Given(@"^(\w+) est connectée?$")]
    public Task GivenSomeoneIsSignedIn(string name) => people.SignedInClient(name);

    [Given(@"^AcroFunJam est déployé avec l'adresse ""([^""]+)"" désignée comme premier administrateur$")]
    [When(@"^AcroFunJam est déployé avec l'adresse ""([^""]+)"" désignée comme premier administrateur$")]
    public void WhenDeployedWithAnInitialAdministrator(string email) => deployment.DeployWithInitialAdministrator(email);

    // --- Role management ----------------------------------------------------------------------

    [When(@"^(\w+) attribue le rôle (" + Roles + @") à ""([^""]*)""$")]
    public async Task WhenSomeoneAssignsARole(string name, string role, string email) =>
        _lastResponse = await (await people.SignedInClient(name))
            .PostAsJsonAsync(new Uri("/identity/role-assignments", UriKind.Relative), new { email, role = RoleLabels.RoleCode(role) });

    [When(@"^un visiteur attribue le rôle (" + Roles + @") à ""([^""]+)""$")]
    public async Task WhenAVisitorAssignsARole(string role, string email)
    {
        using var visitor = deployment.Current.CreateClient();
        _lastResponse = await visitor.PostAsJsonAsync(
            new Uri("/identity/role-assignments", UriKind.Relative), new { email, role = RoleLabels.RoleCode(role) });
    }

    [When(@"^(\w+) retire le rôle (" + Roles + @") à ""([^""]+)""$")]
    public async Task WhenSomeoneRevokesARole(string name, string role, string email) =>
        _lastResponse = await (await people.SignedInClient(name))
            .PostAsJsonAsync(new Uri("/identity/role-revocations", UriKind.Relative), new { email, role = RoleLabels.RoleCode(role) });

    [Given(@"^(\w+) a retiré le rôle (" + Roles + @") à ""([^""]+)""$")]
    public async Task GivenSomeoneHasRevokedARole(string name, string role, string email)
    {
        await WhenSomeoneRevokesARole(name, role, email);
        _lastResponse!.EnsureSuccessStatusCode();
    }

    [Then(@"^(\w+) est (" + Roles + ")$")]
    public async Task ThenSomeoneHasTheRole(string name, string role)
    {
        _lastResponse?.EnsureSuccessStatusCode();
        (await MyAccount(name)).Role.ShouldBe(RoleLabels.RoleCode(role));
    }

    [Then(@"^l'attribution est refusée car (.+)$")]
    [Then(@"^le retrait est refusé car (.+)$")]
    public async Task ThenTheRoleChangeIsRefused(string reason)
    {
        var (status, code) = Refusal(reason);
        var response = _lastResponse.ShouldNotBeNull();
        response.StatusCode.ShouldBe(status);
        if (code is not null)
        {
            var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
            problem.GetProperty("title").GetString().ShouldBe(code);
        }
    }

    // --- Capabilities -------------------------------------------------------------------------

    [When(@"^(\w+) consulte ses capacités$")]
    public async Task WhenSomeoneConsultsTheirCapabilities(string name) => _consulted = await MyAccount(name);

    [Then(@"^les capacités (?:d'|de )(\w+) sont exactement : (.+)$")]
    public void ThenTheCapabilitiesAreExactly(string name, string capabilities)
    {
        _consulted.ShouldNotBeNull().Email.ShouldBe(people[name].Email);
        _consulted.Capabilities.ShouldBe(RoleLabels.CapabilityCodesOf(capabilities), ignoreOrder: true);
    }

    private static (HttpStatusCode Status, string? Code) Refusal(string reason) => reason switch
    {
        "il faut être connecté" => (HttpStatusCode.Unauthorized, null),
        "l'adresse e-mail est absente ou invalide" => (HttpStatusCode.BadRequest, "identity.invalid-email"),
        "seul un administrateur gère les rôles" => (HttpStatusCode.Forbidden, "identity.capability-required"),
        "le rôle utilisateur est celui de tout compte" => (HttpStatusCode.UnprocessableEntity, "identity.user-role-is-implicit"),
        "il doit rester au moins un administrateur" => (HttpStatusCode.Conflict, "identity.last-administrator"),
        _ when reason.StartsWith("aucun compte n'a l'adresse", StringComparison.Ordinal) =>
            (HttpStatusCode.NotFound, "identity.account-not-found"),
        _ when reason.EndsWith("est administrateur, pas validateur", StringComparison.Ordinal) =>
            (HttpStatusCode.UnprocessableEntity, "identity.administrator-is-not-validator"),
        _ when reason.EndsWith("n'est pas validateur", StringComparison.Ordinal) =>
            (HttpStatusCode.UnprocessableEntity, "identity.role-not-held"),
        _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Motif de refus inconnu."),
    };

    private async Task<MyAccountResponse> MyAccount(string name)
    {
        var response = await (await people.SignedInClient(name)).GetAsync(new Uri("/me", UriKind.Relative));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<MyAccountResponse>())!;
    }

    // Black-box view of the HTTP contract.
    private sealed record MyAccountResponse(string Email, string Role, IReadOnlyList<string> Capabilities);
}
