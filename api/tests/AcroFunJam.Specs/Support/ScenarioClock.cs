using System.Globalization;

namespace AcroFunJam.Specs.Support;

/// <summary>
/// The clock of the API for one scenario: the real time until a step sets a date ("Alice a proposé le 2026-11-03…").
/// Not a FakeTimeProvider: a scenario lists submission dates in any order, and FakeTimeProvider cannot go back in time.
/// It replaces the TimeProvider of the whole API, authentication included: bearer tokens are issued and checked
/// against this clock, so a token obtained before a change of date may be seen as expired (or not yet valid) after it.
/// Hence <c>People.SignedInClientAgain</c>, which signs in again after a step has set a date.
/// </summary>
public sealed class ScenarioClock : TimeProvider
{
    private DateTimeOffset? _now;

    public override DateTimeOffset GetUtcNow() => _now ?? System.GetUtcNow();

    public void SetUtcNow(DateTimeOffset now) => _now = now;

    /// <summary>"2026-11-03" (noon UTC) or "2026-11-03 10:00" (UTC), as written in the Gherkin.</summary>
    public static DateTimeOffset Parse(string moment) =>
        DateTimeOffset.ParseExact(
            moment.Length == "yyyy-MM-dd".Length ? moment + " 12:00" : moment,
            "yyyy-MM-dd HH:mm",
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal);

    /// <summary>The day of a moment, as written in the Gherkin ("2026-11-03").</summary>
    public static string DayOf(DateTimeOffset moment) =>
        moment.UtcDateTime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
