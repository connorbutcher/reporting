using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Reductions over every matched row, not only the returned page.</summary>
internal static class TableAggregates
{
    public static async Task<Dictionary<Guid, TableCellDto>> TotalsAsync(
        IQueryable<DatasetRow> matching, List<DataTableColumnSetting> settings, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        var totals = new Dictionary<Guid, TableCellDto>();
        foreach (var setting in settings)
        {
            if (setting.Total is not { } aggregate || !columnsByRef.TryGetValue(setting.ColumnId, out var column))
            {
                continue;
            }

            // Count works on any column; the other aggregates only on numbers.
            var numeric = column.Type is DatasetColumnType.Int or DatasetColumnType.Double;
            if (aggregate != Aggregate.Count && !numeric)
            {
                continue;
            }

            var value = await TotalAsync(matching, column.Id, aggregate);
            // A count is a plain tally; the others read in the column's own number format.
            var config = aggregate == Aggregate.Count ? null : column.GetConfig() as NumericColumnConfig;
            totals[setting.ColumnId] = new TableCellDto
            {
                Value = value,
                DisplayValue = value is { } v ? CellFormatter.Number(v, config) : null,
            };
        }
        return totals;
    }

    /// <summary>Each data-bar column's range, so bars scale the same on every page.</summary>
    public static async Task<Dictionary<Guid, TableColumnStatsDto>> ColumnStatsAsync(
        IQueryable<DatasetRow> matching, List<DataTableColumnSetting> settings, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        var stats = new Dictionary<Guid, TableColumnStatsDto>();
        foreach (var setting in settings)
        {
            if (!setting.DataBars
                || !columnsByRef.TryGetValue(setting.ColumnId, out var column)
                || column.Type is not (DatasetColumnType.Int or DatasetColumnType.Double))
            {
                continue;
            }

            var columnId = column.Id;
            var numbers = matching.SelectMany(r => r.Cells)
                .Where(c => c.ColumnId == columnId && c.NumberValue != null)
                .Select(c => c.NumberValue);
            stats[setting.ColumnId] = new TableColumnStatsDto
            {
                Min = await numbers.MinAsync(),
                Max = await numbers.MaxAsync(),
            };
        }
        return stats;
    }

    /// <summary>Count is the matched rows with a value in the column.</summary>
    private static async Task<double?> TotalAsync(IQueryable<DatasetRow> matching, int columnId, Aggregate aggregate)
    {
        var cells = matching.SelectMany(r => r.Cells).Where(c => c.ColumnId == columnId);
        if (aggregate == Aggregate.Count)
        {
            return await cells.CountAsync(c => c.StringValue != null && c.StringValue != "");
        }

        var numbers = cells.Where(c => c.NumberValue != null).Select(c => c.NumberValue!.Value);
        if (!await numbers.AnyAsync())
        {
            return null;
        }
        return aggregate switch
        {
            Aggregate.Sum => await numbers.SumAsync(),
            Aggregate.Average => await numbers.AverageAsync(),
            Aggregate.Min => await numbers.MinAsync(),
            Aggregate.Max => await numbers.MaxAsync(),
            _ => null,
        };
    }
}
