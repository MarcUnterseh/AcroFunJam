using AcroFunJam.Specs.Support.Identity;
using Npgsql;

namespace AcroFunJam.Specs.Support.Contribution;

/// <summary>Test reading of contribution.pose_revision_proposals: the state of a revision proposal as stored (ADR 0020, 0026).</summary>
public static class PoseRevisionProposalsInDatabase
{
    /// <summary>Statuses of the revision proposals of the account using this address, for the pose of that name before revision.</summary>
    public static async Task<IReadOnlyList<string>> StatusesOf(string email, string poseNameBefore)
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """
            select r.status
            from contribution.pose_revision_proposals r
            join identity.users u on u."Id" = r.contributor_id
            where u."NormalizedEmail" = upper(@email) and r.prior_name = @name
            """,
            connection);
        command.Parameters.AddWithValue("email", email);
        command.Parameters.AddWithValue("name", poseNameBefore);

        var statuses = new List<string>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) statuses.Add(reader.GetString(0));
        return statuses;
    }

    /// <summary>Revision messages of the revision proposals of the account using this address, for the pose of that name before revision.</summary>
    public static async Task<IReadOnlyList<string?>> MessagesOf(string email, string poseNameBefore)
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """
            select r.message
            from contribution.pose_revision_proposals r
            join identity.users u on u."Id" = r.contributor_id
            where u."NormalizedEmail" = upper(@email) and r.prior_name = @name
            """,
            connection);
        command.Parameters.AddWithValue("email", email);
        command.Parameters.AddWithValue("name", poseNameBefore);

        var messages = new List<string?>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) messages.Add(reader.IsDBNull(0) ? null : reader.GetString(0));
        return messages;
    }

    /// <summary>
    /// The single revision proposal of the account using this address for the pose of that name before revision, as stored:
    /// its decision (address of the validator who decided) and its three poses (ADR 0020, ADR 0026).
    /// </summary>
    public static async Task<RecordedRevision> RevisionOf(string contributorEmail, string poseNameBefore)
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """
            select r.status, v."Email", r.decided_at, r.rejection_reason,
                   r.prior_name, r.prior_base_difficulty, r.prior_flyer_difficulty, r.prior_can_start_flow, r.prior_can_end_flow,
                   r.name, r.base_difficulty, r.flyer_difficulty, r.can_start_flow, r.can_end_flow,
                   r.retained_name, r.retained_base_difficulty, r.retained_flyer_difficulty, r.retained_can_start_flow, r.retained_can_end_flow,
                   r.adjustment_note
            from contribution.pose_revision_proposals r
            join identity.users c on c."Id" = r.contributor_id
            left join identity.users v on v."Id" = r.decided_by
            where c."NormalizedEmail" = upper(@email) and r.prior_name = @name
            """,
            connection);
        command.Parameters.AddWithValue("email", contributorEmail);
        command.Parameters.AddWithValue("name", poseNameBefore);

        await using var reader = await command.ExecuteReaderAsync();
        (await reader.ReadAsync()).ShouldBeTrue($"Aucune proposition de modification de la pose « {poseNameBefore} » par {contributorEmail}.");
        StoredPose PoseAt(int i) =>
            new(reader.GetString(i), reader.GetString(i + 1), reader.GetString(i + 2), reader.GetBoolean(i + 3), reader.GetBoolean(i + 4));
        var revision = new RecordedRevision(
            reader.GetString(0),
            reader.IsDBNull(1) ? null : reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetFieldValue<DateTimeOffset>(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            PoseAt(4),
            PoseAt(9),
            reader.IsDBNull(14) ? null : PoseAt(14),
            reader.IsDBNull(19) ? null : reader.GetString(19));
        (await reader.ReadAsync()).ShouldBeFalse($"Plusieurs propositions de modification de la pose « {poseNameBefore} » par {contributorEmail}.");
        return revision;
    }
}

/// <summary>A revision proposal as stored: its decision and its poses before, as proposed and as retained (none unless accepted).</summary>
public sealed record RecordedRevision(
    string Status, string? DecidedBy, DateTimeOffset? DecidedAt, string? RejectionReason, StoredPose Prior, StoredPose Proposed, StoredPose? Retained,
    string? AdjustmentNote);
