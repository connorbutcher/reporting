using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>A row paired with its cell in the column a table is sorted by (null when it has none).</summary>
public sealed class SortedRow
{
    public required DatasetRow Row { get; init; }
    public DatasetCell? Cell { get; init; }
}
