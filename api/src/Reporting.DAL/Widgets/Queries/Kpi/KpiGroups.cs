using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// One value per distinct display label of a dimension column, ordered by label and capped at
/// <see cref="KpiQueryDto.MaxGroups"/>, each reduced like the single value.
/// </summary>
internal static class KpiGroups
{
    public static async Task<(List<KpiGroupResultDto> Groups, bool Truncated)> BuildAsync(
        KpiReduction reduction, IQueryable<DatasetRow> rows, DatasetColumn groupColumn)
    {
        var (scanned, scanTruncated) = await KpiRowScan.LoadAsync(rows, reduction.NeededColumnIds(groupColumn.Id));
        var groups = GroupByLabel(scanned, groupColumn);

        var maxGroups = Math.Clamp(reduction.Dto.MaxGroups, 1, 200);
        var ordered = groups.OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase).ToList();
        var groupsTruncated = ordered.Count > maxGroups;

        var results = ordered.Take(maxGroups).Select(entry => ToResult(entry.Key, entry.Value, reduction)).ToList();
        return (results, scanTruncated || groupsTruncated);
    }

    private static Dictionary<string, List<DatasetRow>> GroupByLabel(List<DatasetRow> rows, DatasetColumn groupColumn)
    {
        var groups = new Dictionary<string, List<DatasetRow>>();
        foreach (var row in rows)
        {
            var cell = row.Cells.FirstOrDefault(c => c.ColumnId == groupColumn.Id);
            var label = Label(cell, groupColumn);
            if (!groups.TryGetValue(label, out var groupRows))
            {
                groups[label] = groupRows = new List<DatasetRow>();
            }
            groupRows.Add(row);
        }
        return groups;
    }

    private static KpiGroupResultDto ToResult(string label, List<DatasetRow> rows, KpiReduction reduction)
    {
        var value = reduction.Reduce(rows);
        return new KpiGroupResultDto
        {
            Label = label,
            Value = value,
            DisplayValue = KpiPresentation.Format(value, reduction.Dto),
            Status = KpiPresentation.Status(value, reduction.Dto),
        };
    }

    /// <summary>Formatted like a pivot dimension, with blank shown as "(blank)".</summary>
    private static string Label(DatasetCell? cell, DatasetColumn column)
    {
        var display = cell is null ? null : CellFormatter.Format(cell, column.Type, column.GetConfig());
        return string.IsNullOrEmpty(display) ? "(blank)" : display;
    }
}
