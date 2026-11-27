using AcroFunJam.Infrastructure.Videos;

namespace AcroFunJam.Infrastructure.Tests.Videos;

/// <summary>
/// The guards of the external processes (ADR 0041), with the shell of the system (cmd on Windows, sh elsewhere): no variable of
/// the host is handed down, a process that lasts too long or is cancelled is killed with its children, and an output that is not
/// what was asked (a reader that stops, a line too long) stops the process.
/// </summary>
[Trait("Category", "Integration")]
public sealed class ExternalProcessTests : IDisposable
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly string _directory = Path.Combine(Path.GetTempPath(), "acrofunjam-tests-" + Guid.NewGuid());

    public ExternalProcessTests() => Directory.CreateDirectory(_directory);

    public void Dispose() => Directory.Delete(_directory, recursive: true);

    [Fact]
    public async Task Run_Should_HandDownNoVariableOfTheHost_When_TheProcessStarts()
    {
        const string Secret = "ACROFUNJAM_TEST_SECRET";
        Environment.SetEnvironmentVariable(Secret, "connection string");
        try
        {
            var lines = new List<string>();
            var outcome = await ExternalProcess.Run(Shell, ShellArguments(OperatingSystem.IsWindows() ? "set" : "env"), TimeSpan.FromSeconds(20),
                lowPriority: false, Ct, line =>
                {
                    lines.Add(line);
                    return true;
                });

            outcome.ShouldBe(new ExternalProcess.Outcome(0, Stopped: false));
            lines.ShouldNotContain(l => l.Contains(Secret, StringComparison.OrdinalIgnoreCase));
            lines.ShouldNotContain(l => l.StartsWith("PATH=", StringComparison.OrdinalIgnoreCase));
        }
        finally
        {
            Environment.SetEnvironmentVariable(Secret, null);
        }
    }

    [Fact]
    public async Task Run_Should_KillTheProcessAndItsChildren_When_ItLastsLongerThanAllowed()
    {
        var written = Path.Combine(_directory, "written");

        await Should.ThrowAsync<TimeoutException>(() =>
            ExternalProcess.Run(Shell, ShellArguments(WriteAfterTwoSeconds(written)), TimeSpan.FromMilliseconds(500), lowPriority: true, Ct));

        await Task.Delay(TimeSpan.FromSeconds(3), Ct);
        File.Exists(written).ShouldBeFalse();
    }

    [Fact]
    public async Task Run_Should_KillTheProcessAndItsChildren_When_ItIsCancelled()
    {
        var written = Path.Combine(_directory, "written");
        using var cancelled = CancellationTokenSource.CreateLinkedTokenSource(Ct);
        cancelled.CancelAfter(TimeSpan.FromMilliseconds(500));

        await Should.ThrowAsync<OperationCanceledException>(() =>
            ExternalProcess.Run(Shell, ShellArguments(WriteAfterTwoSeconds(written)), TimeSpan.FromSeconds(20), lowPriority: false, cancelled.Token));

        await Task.Delay(TimeSpan.FromSeconds(3), Ct);
        File.Exists(written).ShouldBeFalse();
    }

    [Fact]
    public async Task Run_Should_StopTheProcess_When_TheReaderStopsReading()
    {
        var read = 0;
        var endless = OperatingSystem.IsWindows() ? "for /L %i in (1,1,100000000) do @echo %i" : "i=0; while :; do echo $i; i=$((i+1)); done";

        var outcome = await ExternalProcess.Run(Shell, ShellArguments(endless), TimeSpan.FromSeconds(20), lowPriority: false, Ct, _ => ++read < 3);

        outcome.Stopped.ShouldBeTrue();
        read.ShouldBe(3);
    }

    [Fact]
    public async Task Run_Should_StopTheProcess_When_ALineIsLongerThanAllowed()
    {
        var read = 0;
        var endless = OperatingSystem.IsWindows() ? "for /L %i in (1,1,100000000) do @<nul set /p =aaaaaaaaaa" : "while :; do printf aaaaaaaaaa; done";

        var outcome = await ExternalProcess.Run(Shell, ShellArguments(endless), TimeSpan.FromSeconds(20), lowPriority: false, Ct, _ =>
        {
            read++;
            return true;
        });

        outcome.Stopped.ShouldBeTrue();
        read.ShouldBe(0);
    }

    private static string Shell =>
        OperatingSystem.IsWindows() ? Path.Combine(Environment.GetEnvironmentVariable("SystemRoot")!, "System32", "cmd.exe") : "/bin/sh";

    private static string[] ShellArguments(string command) => OperatingSystem.IsWindows() ? ["/d", "/c", command] : ["-c", command];

    /// <summary>
    /// A child shell waits 2 seconds, then writes the file; the shell started waits for it. Only the whole tree killed in time
    /// leaves nothing written. The paths have no space (cmd quoting).
    /// </summary>
    private static string WriteAfterTwoSeconds(string path)
    {
        if (!OperatingSystem.IsWindows()) return $"( /bin/sleep 2; echo x > '{path}' ) & wait";
        var system = Path.Combine(Environment.GetEnvironmentVariable("SystemRoot")!, "System32");
        return $"{Path.Combine(system, "cmd.exe")} /d /c {Path.Combine(system, "PING.EXE")} -n 3 127.0.0.1 ^>nul ^& echo x^> {path}";
    }
}
