using AcroFunJam.Specs.Support.Identity;
using Npgsql;

namespace AcroFunJam.Specs.Support.Contribution;

/// <summary>
/// Test reading of contribution.pose_proposals: the state of a proposal and its decision as stored (ADR 0020), including
/// what « Mes propositions » (story 5) deliberately does not expose, such as the validator who decided (ADR 0023).
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
    /// the validator), when, and the rejection reason (ADR 0020).
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

    /// <summary>
    /// The proposed pose, the retained pose (none unless accepted) and the adjustment note of a proposal, as stored
    /// (story 4, step B, ADR 0020).
    /// </summary>
    public static async Task<RecordedPoses> PosesOf(Guid proposal)
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """
            select name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow,
                   retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow,
                   adjustment_note, proposed_tag_ids, retained_tag_ids
            from contribution.pose_proposals
            where id = @id
            """,
            connection);
        command.Parameters.AddWithValue("id", proposal);

        await using var reader = await command.ExecuteReaderAsync();
        (await reader.ReadAsync()).ShouldBeTrue($"Aucune proposition {proposal}.");
        // Story 9a: the tags compared as sets (their order does not count).
        static string TagsIn(Guid[] ids) => string.Join(",", ids.Order());
        var proposed = new StoredPose(
            reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetBoolean(3), reader.GetBoolean(4), TagsIn(reader.GetFieldValue<Guid[]>(11)));
        var retained = reader.IsDBNull(5)
            ? null
            : new StoredPose(
                reader.GetString(5), reader.GetString(6), reader.GetString(7), reader.GetBoolean(8), reader.GetBoolean(9),
                TagsIn(reader.GetFieldValue<Guid[]>(12)));
        return new RecordedPoses(proposed, retained, reader.IsDBNull(10) ? null : reader.GetString(10));
    }

    /// <summary>The validator who decided on a proposal: their account identifier and address.</summary>
    public static async Task<Decider> DeciderOf(Guid proposal)
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """
            select v."Id", v."Email"
            from contribution.pose_proposals p
            join identity.users v on v."Id" = p.decided_by
            where p.id = @id
            """,
            connection);
        command.Parameters.AddWithValue("id", proposal);

        await using var reader = await command.ExecuteReaderAsync();
        (await reader.ReadAsync()).ShouldBeTrue($"Aucune décision sur la proposition {proposal}.");
        return new Decider(reader.GetGuid(0), reader.GetString(1));
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

/// <summary>A pose as stored: name, difficulty codes, flow indicators and tags (story 9a: identifiers, ordered, comma separated).</summary>
public sealed record StoredPose(string Name, string BaseDifficulty, string FlyerDifficulty, bool CanStartFlow, bool CanEndFlow, string Tags = "");

/// <summary>The proposed pose, the retained pose (none unless accepted) and the adjustment note of a proposal.</summary>
public sealed record RecordedPoses(StoredPose Proposed, StoredPose? Retained, string? AdjustmentNote)
{
    /// <summary>Accepted with adjustments: the retained pose differs from the proposed pose.</summary>
    public bool IsAdjusted => Retained is not null && Retained != Proposed;
}

/// <summary>The validator who decided on a proposal: account identifier and address.</summary>
public sealed record Decider(Guid Id, string Email);
