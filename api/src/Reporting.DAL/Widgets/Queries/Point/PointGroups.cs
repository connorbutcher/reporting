using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>One point per row keyed by series label, each with its tooltip lines, bubble size and sort key.</summary>
internal static class PointGroups
{
    public static Dictionary<string, List<(ChartPointDto Point, IComparable? SortKey)>> Build(List<DatasetRow> rows, PointColumns columns)
    {
        var groups = new Dictionary<string, List<(ChartPointDto Point, IComparable? SortKey)>>();
        foreach (var row in rows)
        {
            var (point, sortKey) = ToPoint(row, columns);
            var seriesKey = SeriesKey(row, columns.Series);
            if (groups.TryGetValue(seriesKey, out var points))
            {
                points.Add((point, sortKey));
            }
            else
            {
                groups[seriesKey] = [(point, sortKey)];
            }
        }
        return groups;
    }

    /// <summary>
    /// The default sort key is the point's own X, so a line draws left to right; a column sort reads that
    /// column's cell instead.
    /// </summary>
    private static (ChartPointDto Point, IComparable? SortKey) ToPoint(DatasetRow row, PointColumns columns)
    {
        var x = PointAxes.Value(row.Cells.First(c => c.ColumnId == columns.XId), columns.X?.Type);
        var y = PointAxes.Value(row.Cells.First(c => c.ColumnId == columns.YId), columns.Y?.Type);

        IComparable? sortKey = columns.Sort is { } sortColumn
            ? PointAxes.SortValue(row.Cells.FirstOrDefault(c => c.ColumnId == sortColumn.Id), sortColumn.Type)
            : (IComparable)x;

        var size = columns.Size is { } sizeColumn
            ? row.Cells.FirstOrDefault(c => c.ColumnId == sizeColumn.Id)?.NumberValue
            : null;

        var point = new ChartPointDto { X = x, Y = y, Size = size, TooltipLines = TooltipLines(row, columns.Tooltips) };
        return (point, sortKey);
    }

    private static string SeriesKey(DatasetRow row, DatasetColumn? seriesColumn)
    {
        if (seriesColumn is null)
        {
            return "";
        }
        var raw = row.Cells.FirstOrDefault(c => c.ColumnId == seriesColumn.Id)?.StringValue?.Trim();
        return string.IsNullOrEmpty(raw) ? "(blank)" : raw;
    }

    /// <summary>Each bound column's formatted value with its prefix and suffix, blanks skipped.</summary>
    private static List<string> TooltipLines(DatasetRow row, List<(ChartTooltipColumn Setting, DatasetColumn? Column)> tooltipColumns)
    {
        var lines = new List<string>();
        foreach (var (setting, column) in tooltipColumns)
        {
            var cell = row.Cells.FirstOrDefault(c => c.ColumnId == column!.Id);
            if (cell is null)
            {
                continue;
            }

            var value = CellFormatter.Format(cell, column!.Type, column.GetConfig());
            if (string.IsNullOrEmpty(value))
            {
                continue;
            }

            lines.Add($"{setting.Prefix}{value}{setting.Suffix}");
        }
        return lines;
    }
}
