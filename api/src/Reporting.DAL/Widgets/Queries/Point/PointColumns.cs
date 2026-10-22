using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// The columns a point chart reads. A missing axis column has id 0, which matches no cell, so the chart is
/// simply empty.
/// </summary>
internal sealed record PointColumns(
    DatasetColumn? X,
    DatasetColumn? Y,
    DatasetColumn? Series,
    DatasetColumn? Size,
    DatasetColumn? Sort,
    List<(ChartTooltipColumn Setting, DatasetColumn? Column)> Tooltips)
{
    public int XId => X?.Id ?? 0;

    public int YId => Y?.Id ?? 0;

    public static PointColumns Resolve(ChartQueryDto dto, ChartSort sort, Dictionary<Guid, DatasetColumn> columnsByRef, IEnumerable<DatasetColumn> allColumns)
    {
        var seriesColumn = dto.SeriesColumnId is { } seriesId ? columnsByRef.GetValueOrDefault(seriesId) : null;

        // Bubble sizing needs a number; any other type is ignored like a stale column id.
        var sizeColumn = dto.SizeColumnId is { } sizeId ? columnsByRef.GetValueOrDefault(sizeId) : null;
        if (sizeColumn?.Type is not (DatasetColumnType.Int or DatasetColumnType.Double))
        {
            sizeColumn = null;
        }

        // A column sort can name any column, plotted or not.
        var sortColumn = sort.By == ChartSortBy.Column && sort.ColumnId is { } sortColumnRef
            ? columnsByRef.GetValueOrDefault(sortColumnRef)
            : null;

        var tooltipColumns = dto.TooltipColumns
            .Select(tooltipColumn => (Setting: tooltipColumn, Column: BarChartQueryService.ResolveTooltipColumn(tooltipColumn, columnsByRef, allColumns)))
            .Where(p => p.Column is not null)
            .ToList();

        return new PointColumns(
            columnsByRef.GetValueOrDefault(dto.XColumnId),
            columnsByRef.GetValueOrDefault(dto.YColumnId),
            seriesColumn,
            sizeColumn,
            sortColumn,
            tooltipColumns);
    }

    /// <summary>Only these cells are loaded per row.</summary>
    public HashSet<int> NeededIds()
    {
        var ids = new HashSet<int> { XId, YId };
        foreach (var column in new[] { Series, Size, Sort })
        {
            if (column is not null)
            {
                ids.Add(column.Id);
            }
        }
        foreach (var (_, column) in Tooltips)
        {
            ids.Add(column!.Id);
        }
        return ids;
    }
}
