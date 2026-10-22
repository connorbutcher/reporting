using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

internal static class TooltipColumns
{
    /// <summary>By id, else by name when the column was picked from another dataset's schema.</summary>
    public static DatasetColumn? Resolve(
        ChartTooltipColumn setting, Dictionary<Guid, DatasetColumn> columnsByRef, IEnumerable<DatasetColumn> columns)
    {
        return columnsByRef.GetValueOrDefault(setting.ColumnId)
            ?? (string.IsNullOrWhiteSpace(setting.ColumnName)
                ? null
                : columns.FirstOrDefault(c => string.Equals(c.Name, setting.ColumnName, StringComparison.OrdinalIgnoreCase)));
    }
}
