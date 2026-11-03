using Microsoft.AspNetCore.Identity;

namespace AcroFunJam.Api.Authentication;

/// <summary>Product rules applied to the accounts of ASP.NET Core Identity (ADR 0011).</summary>
internal static class AccountRules
{
    /// <summary>Same value as <c>PasswordPolicy</c> in <c>@acrofunjam/core</c> (checked before sending by the site).</summary>
    public const int MinimumPasswordLength = 10;

    public static void Apply(IdentityOptions options)
    {
        options.User.RequireUniqueEmail = true;

        // Length over composition: pass phrases are allowed (NIST SP 800-63B).
        options.Password.RequiredLength = MinimumPasswordLength;
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredUniqueChars = 1;

        // Explicit, so that a library upgrade cannot change the rule silently.
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    }
}
