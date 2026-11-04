using Npgsql;

namespace AcroFunJam.Specs.Support.Identity;

/// <summary>
/// Deletes an account for a "Soit" step: deleting an account is not a feature yet (story 3 decision, ADR 0018),
/// so the account disappears from identity.users as it would by an operation on the database (ADR 0020).
/// </summary>
public static class AccountsInDatabase
{
    public static async Task Delete(string email)
    {
        await using var connection = new NpgsqlConnection(IntegrationDatabase.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("""delete from identity.users where "NormalizedEmail" = upper(@email)""", connection);
        command.Parameters.AddWithValue("email", email);
        (await command.ExecuteNonQueryAsync()).ShouldBe(1, $"Le compte {email} devrait exister avant d'être supprimé.");
    }
}
