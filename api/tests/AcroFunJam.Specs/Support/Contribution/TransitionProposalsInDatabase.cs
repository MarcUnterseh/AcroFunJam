using AcroFunJam.Specs.Support.Identity;
using Npgsql;

namespace AcroFunJam.Specs.Support.Contribution;

/// <summary>
/// Test reading of contribution.transition_proposals: the state of a transition proposal as stored (ADR 0020, ADR 0028).
/// The proposal stores no pose name: the current names are read in catalog.poses.
/// </summary>
public static class TransitionProposalsInDatabase
{
    /// <summary>The transition proposals of the account using this address, from and to the poses of these names.</summary>
    public static async Task<IReadOnlyList<RecordedTransitionProposal>> Of(string email, string fromPose, string toPose)
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """
            select t.status, t.name, t.base_difficulty, t.flyer_difficulty, t.description
            from contribution.transition_proposals t
            join identity.users u on u."Id" = t.contributor_id
            join catalog.poses f on f.id = t.from_pose_id
            join catalog.poses d on d.id = t.to_pose_id
            where u."NormalizedEmail" = upper(@email) and f.name = @from and d.name = @to
            """,
            connection);
        command.Parameters.AddWithValue("email", email);
        command.Parameters.AddWithValue("from", fromPose);
        command.Parameters.AddWithValue("to", toPose);

        var proposals = new List<RecordedTransitionProposal>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            proposals.Add(new RecordedTransitionProposal(
                reader.GetString(0),
                reader.IsDBNull(1) ? null : reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4)));
        }

        return proposals;
    }

    /// <summary>
    /// The decision recorded on a transition proposal, as stored: who decided (address of the validator), when, why, and the
    /// transition as proposed and as retained (ADR 0028).
    /// </summary>
    public static async Task<RecordedTransitionDecision> DecisionOn(Guid proposal)
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            """
            select t.status, v."Email", t.decided_at, t.rejection_reason,
                   t.name, t.base_difficulty, t.flyer_difficulty, t.description,
                   t.retained_name, t.retained_base_difficulty, t.retained_flyer_difficulty, t.retained_description, t.adjustment_note,
                   array_to_string(array(select unnest(t.proposed_tag_ids) order by 1), ','),
                   array_to_string(array(select unnest(t.retained_tag_ids) order by 1), ',')
            from contribution.transition_proposals t
            left join identity.users v on v."Id" = t.decided_by
            where t.id = @id
            """,
            connection);
        command.Parameters.AddWithValue("id", proposal);

        await using var reader = await command.ExecuteReaderAsync();
        (await reader.ReadAsync()).ShouldBeTrue($"Aucune proposition de transition {proposal}.");
        string? Text(int i) => reader.IsDBNull(i) ? null : reader.GetString(i);
        return new RecordedTransitionDecision(
            reader.GetString(0),
            Text(1),
            reader.IsDBNull(2) ? null : reader.GetFieldValue<DateTimeOffset>(2),
            Text(3),
            new StoredTransition(Text(4), Text(5)!, Text(6)!, Text(7)) { Tags = Text(13) ?? "" },
            Text(9) is null ? null : new StoredTransition(Text(8), Text(9)!, Text(10)!, Text(11)) { Tags = Text(14) ?? "" },
            Text(12));
    }
}

/// <summary>A transition as stored: its name, difficulty codes and description, and its tags (story 8, sorted identifiers).</summary>
public sealed record StoredTransition(string? Name, string BaseDifficulty, string FlyerDifficulty, string? Description)
{
    public string Tags { get; init; } = "";
}

/// <summary>The decision on a transition proposal as stored, with the transition as proposed and as retained (none unless accepted).</summary>
public sealed record RecordedTransitionDecision(
    string Status, string? DecidedBy, DateTimeOffset? DecidedAt, string? RejectionReason, StoredTransition Proposed, StoredTransition? Retained,
    string? AdjustmentNote);

/// <summary>A transition proposal as stored: its status and the transition as proposed.</summary>
public sealed record RecordedTransitionProposal(string Status, string? Name, string BaseDifficulty, string FlyerDifficulty, string? Description);
