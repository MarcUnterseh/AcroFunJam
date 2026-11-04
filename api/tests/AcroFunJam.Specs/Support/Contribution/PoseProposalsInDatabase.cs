using AcroFunJam.Specs.Support.Identity;
using Npgsql;

namespace AcroFunJam.Specs.Support.Contribution;

/// <summary>
/// Test reading of contribution.pose_proposals: "mes propositions" (story 5) does not exist yet, so the state of a
/// proposal and its decision are observed in the database (ADR 0020).
/// </summary>
public static class PoseProposalsInDatabase
{
    /// <summary>Statuses of the proposals of the account using this address, optionally of a given pose name.</summary>
    public static async Task<IReadOnlyList<string>> StatusesOf(string email, string? poseName = null)
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """
            select p.status
            from contribution.pose_proposals p
            join identity.users u on u."Id" = p.contributor_id
            where u."NormalizedEmail" = upper(@email) and (@name::text is null or p.name = @name)
            """,
            connection);
        command.Parameters.AddWithValue("email", email);
        command.Parameters.Add(new NpgsqlParameter("name", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)poseName ?? DBNull.Value });

        var statuses = new List<string>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) statuses.Add(reader.GetString(0));
        return statuses;
    }

    /// <summary>
    /// The decision recorded on the proposal of a pose by the account using this address: who decided (address of
    /// the validator), when, and the rejection reason. "Suivre mes propositions" (story 5) does not exist yet (ADR 0020).
    /// </summary>
    public static async Task<RecordedDecision> DecisionOn(string contributorEmail, string poseName)
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """
            select p.status, v."Email", p.decided_at, p.rejection_reason
            from contribution.pose_proposals p
            join identity.users c on c."Id" = p.contributor_id
            left join identity.users v on v."Id" = p.decided_by
            where c."NormalizedEmail" = upper(@email) and p.name = @name
            """,
            connection);
        command.Parameters.AddWithValue("email", contributorEmail);
        command.Parameters.AddWithValue("name", poseName);

        await using var reader = await command.ExecuteReaderAsync();
        (await reader.ReadAsync()).ShouldBeTrue($"Aucune proposition de la pose « {poseName} » par {contributorEmail}.");
        var decision = new RecordedDecision(
            reader.GetString(0),
            reader.IsDBNull(1) ? null : reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetFieldValue<DateTimeOffset>(2),
            reader.IsDBNull(3) ? null : reader.GetString(3));
        (await reader.ReadAsync()).ShouldBeFalse($"Plusieurs propositions de la pose « {poseName} » par {contributorEmail}.");
        return decision;
    }

    /// <summary>Number of proposals pending validation, all contributors together.</summary>
    public static async Task<long> CountPending()
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("select count(*) from contribution.pose_proposals where status = 'pending'", connection);
        return (long)(await command.ExecuteScalarAsync())!;
    }
}

/// <summary>A proposal as stored: status, validator who decided (address), decision date, rejection reason.</summary>
public sealed record RecordedDecision(string Status, string? DecidedBy, DateTimeOffset? DecidedAt, string? RejectionReason);
