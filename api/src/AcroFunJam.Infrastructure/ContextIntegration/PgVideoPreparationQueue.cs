using System.Data;
using AcroFunJam.Application.Catalog;
using AcroFunJam.Domain.Catalog;
using AcroFunJam.Infrastructure.Persistence;
using AcroFunJam.Infrastructure.Persistence.Catalog;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AcroFunJam.Infrastructure.ContextIntegration;

/// <summary>
/// PostgreSQL adapter of <see cref="IVideoPreparationQueue"/> (ADR 0041): the table catalog.video_preparation_jobs. A job is
/// added and removed with the unit of work of the use case; it is claimed by a single statement, its own short transaction,
/// which skips the rows another worker is claiming (<c>FOR UPDATE SKIP LOCKED</c>), gives a lease of 15 minutes and counts an
/// attempt. No lock is kept during the preparation. A worker that stops gives its job back at once, its attempt not counted.
/// </summary>
[System.Diagnostics.CodeAnalysis.SuppressMessage("Naming", "CA1711", Justification = "The name of the ADR 0041: a queue of jobs, not a collection.")]
public sealed class PgVideoPreparationQueue(AcroFunJamDbContext context) : IVideoPreparationQueue
{
    private const string ClaimSql = """
        UPDATE catalog.video_preparation_jobs
        SET lease_until = now() + interval '15 minutes', attempts = attempts + 1
        WHERE video_id = (
            SELECT video_id FROM catalog.video_preparation_jobs
            WHERE lease_until IS NULL OR lease_until < now()
            ORDER BY enqueued_at
            FOR UPDATE SKIP LOCKED
            LIMIT 1)
        RETURNING video_id, transition_id, attempts
        """;

    public void Enqueue(VideoId video, TransitionId transition, DateTimeOffset at) =>
        context.Set<VideoPreparationJobRecord>().Add(new VideoPreparationJobRecord
        {
            VideoId = video.Value,
            TransitionId = transition.Value,
            EnqueuedAt = at,
        });

    public async Task<VideoPreparationJob?> Claim(CancellationToken ct)
    {
        var connection = (NpgsqlConnection)context.Database.GetDbConnection();
        var opened = connection.State != ConnectionState.Open;
        if (opened) await connection.OpenAsync(ct);
        try
        {
            await using var command = new NpgsqlCommand(ClaimSql, connection);
            await using var reader = await command.ExecuteReaderAsync(ct);
            if (!await reader.ReadAsync(ct)) return null;
            return new VideoPreparationJob(new VideoId(reader.GetGuid(0)), new TransitionId(reader.GetGuid(1)), reader.GetInt32(2));
        }
        finally
        {
            if (opened) await connection.CloseAsync();
        }
    }

    /// <summary>Its own statement, outside the unit of work: the worker stops, nothing else is saved.</summary>
    public async Task Release(VideoId video, CancellationToken ct) =>
        await context.Database.ExecuteSqlAsync(
            $"UPDATE catalog.video_preparation_jobs SET lease_until = NULL, attempts = GREATEST(attempts - 1, 0) WHERE video_id = {video.Value}", ct);

    public void Complete(VideoId video) =>
        context.Set<VideoPreparationJobRecord>().Remove(new VideoPreparationJobRecord { VideoId = video.Value });
}
