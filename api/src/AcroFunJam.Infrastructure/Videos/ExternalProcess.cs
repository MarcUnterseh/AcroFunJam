using System.Diagnostics;
using System.Text;

namespace AcroFunJam.Infrastructure.Videos;

/// <summary>
/// Runs ffmpeg or ffprobe as an external process (ADR 0041): the arguments passed one by one, never a composed command line; an
/// emptied environment, so that no secret is handed down; a maximum duration, after which the process is killed, as it is on
/// cancellation; optionally at a lower priority. Nothing it writes is held whole in memory: its output is read line by line, each
/// line handed to the caller, who may stop the process; a line longer than <see cref="MaxLineChars"/> stops it too. Its error
/// output is read and dropped.
/// </summary>
internal static class ExternalProcess
{
    /// <summary>The longest line of output read: beyond, the output is not what was asked, and the process is stopped.</summary>
    public const int MaxLineChars = 4096;

    /// <summary>The exit code of the process, or <see cref="Stopped"/> when it was stopped while it wrote (and killed).</summary>
    public sealed record Outcome(int ExitCode, bool Stopped);

    /// <param name="readLine">Called for each line of output; <c>false</c> stops the process. None: the output is dropped.</param>
    /// <exception cref="TimeoutException">The process lasted longer than allowed (it was killed).</exception>
    public static async Task<Outcome> Run(
        string executable, IEnumerable<string> arguments, TimeSpan timeout, bool lowPriority, CancellationToken ct, Func<string, bool>? readLine = null)
    {
        var start = new ProcessStartInfo(executable)
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        foreach (var argument in arguments) start.ArgumentList.Add(argument);
        KeepOnlyWhatTheSystemNeeds(start);

        using var process = new Process { StartInfo = start };
        process.Start();
        if (lowPriority) TryLowerPriority(process);
        process.StandardInput.Close();

        using var limit = CancellationTokenSource.CreateLinkedTokenSource(ct);
        limit.CancelAfter(timeout);
        var errors = Drop(process.StandardError, limit.Token);
        try
        {
            if (!await ReadLines(process.StandardOutput, readLine ?? (_ => true), limit.Token))
            {
                process.Kill(entireProcessTree: true);
                await process.WaitForExitAsync(limit.Token);
                return new Outcome(-1, Stopped: true);
            }

            await process.WaitForExitAsync(limit.Token);
            await errors;
            return new Outcome(process.ExitCode, Stopped: false);
        }
        catch (OperationCanceledException)
        {
            process.Kill(entireProcessTree: true);
            if (ct.IsCancellationRequested) throw;
            throw new TimeoutException($"{Path.GetFileName(executable)} lasted more than {timeout}.");
        }
    }

    /// <summary>Hands each line to the caller; <c>false</c> when the caller stopped, or when a line is too long.</summary>
    private static async Task<bool> ReadLines(StreamReader output, Func<string, bool> readLine, CancellationToken ct)
    {
        var buffer = new char[MaxLineChars];
        var line = new StringBuilder();
        int read;
        while ((read = await output.ReadAsync(buffer, ct)) > 0)
        {
            for (var i = 0; i < read; i++)
            {
                var c = buffer[i];
                if (c == '\n')
                {
                    if (!readLine(line.ToString().TrimEnd('\r'))) return false;
                    line.Clear();
                }
                else if (line.Length >= MaxLineChars)
                {
                    return false;
                }
                else
                {
                    line.Append(c);
                }
            }
        }

        return line.Length == 0 || readLine(line.ToString().TrimEnd('\r'));
    }

    /// <summary>Reads the error output to its end, so that the process never blocks on it, and keeps nothing.</summary>
    private static async Task Drop(StreamReader errors, CancellationToken ct)
    {
        var buffer = new char[4096];
        while (await errors.ReadAsync(buffer, ct) > 0)
        {
        }
    }

    /// <summary>No variable of the host (connection strings, keys) is handed down; Windows needs its system root to start a process.</summary>
    private static void KeepOnlyWhatTheSystemNeeds(ProcessStartInfo start)
    {
        var systemRoot = Environment.GetEnvironmentVariable("SystemRoot");
        start.Environment.Clear();
        if (OperatingSystem.IsWindows() && systemRoot is not null) start.Environment["SystemRoot"] = systemRoot;
    }

    private static void TryLowerPriority(Process process)
    {
        try
        {
            process.PriorityClass = ProcessPriorityClass.BelowNormal; // nice 10 on Linux
        }
        catch (Exception e) when (e is InvalidOperationException or System.ComponentModel.Win32Exception or PlatformNotSupportedException)
        {
            // Already finished, or not allowed: the preparation goes on at the normal priority.
        }
    }
}
