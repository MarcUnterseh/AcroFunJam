using Reqnroll;

namespace AcroFunJam.Specs.Support;

/// <summary>A column a table may leave out (story 9: the difficulties « débutant » unless given).</summary>
public static class DataTableRows
{
    public static string Or(this DataTableRow row, string column, string fallback)
    {
        ArgumentNullException.ThrowIfNull(row);
        return row.TryGetValue(column, out var value) ? value : fallback;
    }
}
