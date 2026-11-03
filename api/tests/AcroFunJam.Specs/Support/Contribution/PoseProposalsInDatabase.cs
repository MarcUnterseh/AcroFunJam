using AcroFunJam.Specs.Support.Identity;
using Npgsql;

namespace AcroFunJam.Specs.Support.Contribution;

/// <summary>
/// Test reading of contribution.pose_proposals: neither "mes propositions" nor the validation queue exist yet,
/// so the state "en attente de validation" is observed in the database (ADR 0020).
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
}
