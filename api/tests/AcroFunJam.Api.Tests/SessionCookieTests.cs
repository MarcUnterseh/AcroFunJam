using System.Net;
using System.Net.Http.Json;

namespace AcroFunJam.Api.Tests;

/// <summary>The web session is an Identity cookie (ADR 0011): attributes, 401 instead of redirects, logout, sliding expiry.</summary>
[Trait("Category", "Integration")]
public sealed class SessionCookieTests(ApiWithDatabase api) : IClassFixture<ApiWithDatabase>
{
    private const string Password = "une phrase de passe";
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static string NewEmail() => $"alice-{Guid.NewGuid():N}@example.org";

    private async Task<HttpClient> SignedInBrowser(string email)
    {
        var browser = api.CreateBrowserClient();
        (await browser.PostAsJsonAsync(new Uri("/identity/register", UriKind.Relative), new { email, password = Password }, Ct)).EnsureSuccessStatusCode();
        (await browser.PostAsJsonAsync(new Uri("/identity/login?useCookies=true", UriKind.Relative), new { email, password = Password }, Ct)).EnsureSuccessStatusCode();
        return browser;
    }

    [Fact]
    public async Task Login_Should_SetAHostPrefixedHttpOnlySecureStrictCookie_When_UsingCookies()
    {
        var email = NewEmail();
        using var browser = api.CreateBrowserClient(handleCookies: false);
        (await browser.PostAsJsonAsync(new Uri("/identity/register", UriKind.Relative), new { email, password = Password }, Ct)).EnsureSuccessStatusCode();

        var response = await browser.PostAsJsonAsync(new Uri("/identity/login?useCookies=true", UriKind.Relative), new { email, password = Password }, Ct);

        var cookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("__Host-afj-session=", StringComparison.Ordinal)).ToLowerInvariant();
        cookie.ShouldContain("httponly");
        cookie.ShouldContain("secure");
        cookie.ShouldContain("samesite=strict");
        cookie.ShouldContain("path=/");
        cookie.ShouldContain("expires="); // persistent: survives closing the tab
    }

    [Fact]
    public async Task Me_Should_ReturnTheAccount_When_AuthenticatedByTheCookie()
    {
        var email = NewEmail();
        using var browser = await SignedInBrowser(email);

        var me = await browser.GetFromJsonAsync<MyAccount>(new Uri("/me", UriKind.Relative), Ct);

        me.ShouldNotBeNull().Email.ShouldBe(email);
    }

    [Fact]
    public async Task Me_Should_Return401_When_ThereIsNoSession()
    {
        using var browser = api.CreateBrowserClient();

        var response = await browser.GetAsync(new Uri("/me", UriKind.Relative), Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized); // never a redirection to a login page
    }

    [Fact]
    public async Task RoleAssignment_Should_Return403_When_TheCookieSessionLacksTheCapability()
    {
        using var browser = await SignedInBrowser(NewEmail());

        var response = await browser.PostAsJsonAsync(
            new Uri("/identity/role-assignments", UriKind.Relative), new { email = NewEmail(), role = "validator" }, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Logout_Should_EndTheSession_When_SignedIn()
    {
        using var browser = await SignedInBrowser(NewEmail());

        var logout = await browser.PostAsync(new Uri("/identity/logout", UriKind.Relative), content: null, Ct);

        logout.StatusCode.ShouldBe(HttpStatusCode.NoContent);
        (await browser.GetAsync(new Uri("/me", UriKind.Relative), Ct)).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Logout_Should_Return204_When_NotSignedIn()
    {
        using var browser = api.CreateBrowserClient();

        var logout = await browser.PostAsync(new Uri("/identity/logout", UriKind.Relative), content: null, Ct);

        logout.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Session_Should_BeRenewed_When_UsedAfterHalfOfItsLifetime()
    {
        using var browser = await SignedInBrowser(NewEmail());

        api.Clock.Advance(TimeSpan.FromDays(8));
        (await browser.GetAsync(new Uri("/me", UriKind.Relative), Ct)).StatusCode.ShouldBe(HttpStatusCode.OK);
        api.Clock.Advance(TimeSpan.FromDays(8)); // 16 days after sign-in, 8 after the renewal

        (await browser.GetAsync(new Uri("/me", UriKind.Relative), Ct)).StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Session_Should_Expire_When_UnusedForItsWholeLifetime()
    {
        using var browser = await SignedInBrowser(NewEmail());

        api.Clock.Advance(TimeSpan.FromDays(15));

        (await browser.GetAsync(new Uri("/me", UriKind.Relative), Ct)).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    private sealed record MyAccount(string Email, string Role);
}
