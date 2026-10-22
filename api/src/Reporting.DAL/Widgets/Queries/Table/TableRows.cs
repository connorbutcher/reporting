using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Each row as a formatted, tolerance-classified cell per requested column.</summary>
internal static class TableRows
{
    public static TableRowResultDto Map(
        DatasetRow row, List<DataTableColumnSetting> settings, Dictionary<Guid, DatasetColumn> columnsByRef, TableTolerances tolerances)
    {
        var cells = new Dictionary<Guid, TableCellDto>();
        foreach (var setting in settings)
        {
            if (!columnsByRef.TryGetValue(setting.ColumnId, out var column))
            {
                continue;
            }

            cells[setting.ColumnId] = Cell(row, setting, column, columnsByRef, tolerances);
        }
        return new TableRowResultDto { Id = row.RefId, Cells = cells };
    }

    private static TableCellDto Cell(
        DatasetRow row, DataTableColumnSetting setting, DatasetColumn column, Dictionary<Guid, DatasetColumn> columnsByRef, TableTolerances tolerances)
    {
        var cell = row.Cells.FirstOrDefault(c => c.ColumnId == column.Id);
        var display = cell is null ? null : CellFormatter.Format(cell, column.Type, column.GetConfig());

        var status = ToleranceStatus.None;
        if (setting.Tolerance is not null && cell?.NumberValue is { } value)
        {
            status = ToleranceResolver.Classify(value, BoundsFor(row, setting, columnsByRef, tolerances));
        }

        return new TableCellDto { DisplayValue = display, Value = TypedValue(cell, column.Type), Tolerance = status };
    }

    /// <summary>In the column's own type, falling back to the stored text where it didn't parse.</summary>
    private static object? TypedValue(DatasetCell? cell, DatasetColumnType type)
    {
        if (cell is null)
        {
            return null;
        }
        object? typed = type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double => cell.NumberValue,
            DatasetColumnType.DateTime => cell.DateValue,
            DatasetColumnType.Bool => cell.BoolValue,
            _ => null,
        };
        return typed ?? (string.IsNullOrEmpty(cell.StringValue) ? null : cell.StringValue);
    }

    /// <summary>A matching column's limits row is the one whose identifier equals this row's value; otherwise the fixed band.</summary>
    private static ToleranceBounds? BoundsFor(
        DatasetRow row, DataTableColumnSetting setting, Dictionary<Guid, DatasetColumn> columnsByRef, TableTolerances tolerances)
    {
        if (setting.Tolerance?.Match is { } match)
        {
            if (tolerances.MatchedLimits.TryGetValue(setting.ColumnId, out var limits)
                && columnsByRef.TryGetValue(match.ColumnId, out var keyColumn))
            {
                return limits.For(row.Cells.FirstOrDefault(c => c.ColumnId == keyColumn.Id));
            }
            return null;
        }

        tolerances.Bounds.TryGetValue(setting.ColumnId, out var columnBounds);
        return columnBounds;
    }
}
