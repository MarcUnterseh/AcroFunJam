using Microsoft.AspNetCore.Authentication.Cookies;

namespace AcroFunJam.Api.Authentication;

/// <summary>The web session cookie issued by <c>/identity/login?useCookies=true</c> (ADR 0011).</summary>
internal static class SessionCookie
{
    public const string Name = "__Host-afj-session";

    public static void Configure(CookieAuthenticationOptions options)
    {
        options.Cookie.Name = Name; // __Host-: Secure, Path=/, no Domain
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.Path = "/";
        options.ExpireTimeSpan = TimeSpan.FromDays(14);
        options.SlidingExpiration = true;

        // An API never redirects to a login page: it answers 401 / 403 (the site shows its own pages).
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    }
}
