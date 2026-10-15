using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Rows shaped for a scatter/line chart widget: filtered, grouped into series by the series
/// column's value, paired with resolved tolerance bounds and pre-formatted tooltip lines — the
/// client only builds the ECharts option.
/// </summary>
public class ChartQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands, DatasetResolver resolver)
{
    /// <summary>
    /// Ceiling on points returned for one scatter/line query. Past this the payload and the
    /// client-side render stop being worth it; the response flags that it was capped so the
    /// widget can say so. The client thins what it draws (LTTB / large-scatter mode) on top.
    /// </summary>
    private const int MaxChartPoints = 20_000;

    public async Task<ChartQueryResultDto?> QueryForChartAsync(int id, ChartQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;

        // Keyed by RefId (the client's reference); resolved to int ids for cell comparisons below.
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // Resolve the tolerance bands up front: their bounds draw the reference lines below, and
        // a tolerance filter operator reuses the band on the filtered column's axis.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, dto.XColumnId, dto.YColumnId);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, toleranceByColumn, operatorCatalogue);
        var (totalRowCount, matchedRowCount) = await RowCounts.CountRowsAsync(all, matching);

        // Resolve the axis columns; a missing column yields a sentinel id that matches no cell,
        // so the chart is simply empty (as before). An axis value is a string for a text column,
        // a timestamp (epoch millis) for a date column, and a number otherwise.
        var xColumn = columnsByRef.GetValueOrDefault(dto.XColumnId);
        var yColumn = columnsByRef.GetValueOrDefault(dto.YColumnId);
        var xId = xColumn?.Id ?? 0;
        var yId = yColumn?.Id ?? 0;

        // A trend line needs two real numbers to fit — a text axis (category) has none.
        var xNumeric = xColumn?.Type is DatasetColumnType.Int or DatasetColumnType.Double or DatasetColumnType.DateTime;
        var yNumeric = yColumn?.Type is DatasetColumnType.Int or DatasetColumnType.Double or DatasetColumnType.DateTime;

        // Points need a real value on each axis; anything missing either is dropped. Narrowed per
        // axis kind so the predicate stays EF-translatable rather than branching per row.
        var plottable = RequireAxisValue(matching, xId, xColumn?.Type);
        plottable = RequireAxisValue(plottable, yId, yColumn?.Type);

        var seriesColumn = dto.SeriesColumnId is { } seriesId ? columnsByRef.GetValueOrDefault(seriesId) : null;
        // Bubble sizing needs a real number; a text/date/bool column is ignored rather than erroring,
        // the same way a stale/mistyped column id would be.
        var sizeColumn = dto.SizeColumnId is { } sizeId ? columnsByRef.GetValueOrDefault(sizeId) : null;
        if (sizeColumn?.Type is not (DatasetColumnType.Int or DatasetColumnType.Double))
        {
            sizeColumn = null;
        }
        var tooltipColumns = dto.TooltipColumns
            .Select(tooltipColumn => (Setting: tooltipColumn, Column: columnsByRef.GetValueOrDefault(tooltipColumn.ColumnId)))
            .Where(p => p.Column is not null)
            .ToList();

        // A column sort can name any column in the dataset — not necessarily one plotted — so
        // it's resolved and pulled alongside the axes rather than assumed to already be loaded.
        var sort = dto.Sort ?? new ChartSort();
        var sortColumn = sort.By == ChartSortBy.Column && sort.ColumnId is { } sortColumnRef
            ? columnsByRef.GetValueOrDefault(sortColumnRef)
            : null;

        // Only the cells the chart actually reads are loaded per row — the axes, the series key,
        // any tooltip columns, and the sort column — via a filtered include, rather than pulling
        // every cell in the row across the wire.
        var neededIds = new HashSet<int> { xId, yId };
        if (seriesColumn is not null)
        {
            neededIds.Add(seriesColumn.Id);
        }
        if (sizeColumn is not null)
        {
            neededIds.Add(sizeColumn.Id);
        }
        if (sortColumn is not null)
        {
            neededIds.Add(sortColumn.Id);
        }
        foreach (var (_, column) in tooltipColumns)
        {
            neededIds.Add(column!.Id);
        }

        // Cap the rows pulled back: a runaway dataset shouldn't ship hundreds of
        // thousands of points the browser then chokes on. Count first so the client
        // can report how much was left off, then take a deterministic slice.
        var total = await plottable.CountAsync();
        var rows = await plottable
            .OrderBy(r => r.Id)
            .Take(MaxChartPoints)
            .Include(r => r.Cells.Where(c => neededIds.Contains(c.ColumnId)))
            // Read-only: these rows/cells are projected to points below and discarded, never saved.
            .AsNoTracking()
            .ToListAsync();

        var groups = BuildPointGroups(rows, xId, yId, xColumn?.Type, yColumn?.Type, seriesColumn, sizeColumn, sortColumn, tooltipColumns);

        return new ChartQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Series = groups.Select(group => new ChartSeriesDto
            {
                Label = group.Key,
                Points = OrderPoints(group.Value, sort.Descending),
                TrendLine = dto.ShowTrendLine && xNumeric && yNumeric
                    ? ComputeTrendLine(group.Value.Select(entry => entry.Point))
                    : null
            }).ToList(),
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount,
            TotalPoints = total,
            Truncated = total > MaxChartPoints
        };
    }

    /// <summary>
    /// Builds one point per row, keyed by series label. Each point carries its pre-formatted
    /// tooltip lines, its optional bubble size, and the sort key the caller later orders it by.
    /// </summary>
    private static Dictionary<string, List<(ChartPointDto Point, IComparable? SortKey)>> BuildPointGroups(
        List<DatasetRow> rows,
        int xId,
        int yId,
        DatasetColumnType? xType,
        DatasetColumnType? yType,
        DatasetColumn? seriesColumn,
        DatasetColumn? sizeColumn,
        DatasetColumn? sortColumn,
        List<(ChartTooltipColumn Setting, DatasetColumn? Column)> tooltipColumns)
    {
        var groups = new Dictionary<string, List<(ChartPointDto Point, IComparable? SortKey)>>();
        foreach (var row in rows)
        {
            var xCell = row.Cells.First(c => c.ColumnId == xId);
            var yCell = row.Cells.First(c => c.ColumnId == yId);
            object x = AxisValue(xCell, xType);
            object y = AxisValue(yCell, yType);

            var seriesKey = "";
            if (seriesColumn is not null)
            {
                var raw = row.Cells.FirstOrDefault(c => c.ColumnId == seriesColumn.Id)?.StringValue?.Trim();
                seriesKey = string.IsNullOrEmpty(raw) ? "(blank)" : raw;
            }

            var tooltipLines = BuildTooltipLines(row, tooltipColumns);

            // The default sort key is the point's own X — a line then draws left-to-right instead
            // of zig-zagging (harmless for scatter); a text X sorts alphabetically. A column sort
            // reads that column's own cell instead, tolerating a row with no value for it.
            IComparable? sortKey = sortColumn is not null
                ? SortValue(row.Cells.FirstOrDefault(c => c.ColumnId == sortColumn.Id), sortColumn.Type)
                : (IComparable)x;

            var size = sizeColumn is not null
                ? row.Cells.FirstOrDefault(c => c.ColumnId == sizeColumn.Id)?.NumberValue
                : null;

            var point = new ChartPointDto { X = x, Y = y, Size = size, TooltipLines = tooltipLines };
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

    /// <summary>One row's pre-formatted tooltip lines — each bound column's value with its configured prefix/suffix, blanks skipped.</summary>
    private static List<string> BuildTooltipLines(DatasetRow row, List<(ChartTooltipColumn Setting, DatasetColumn? Column)> tooltipColumns)
    {
        var tooltipLines = new List<string>();
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

            tooltipLines.Add($"{setting.Prefix}{value}{setting.Suffix}");
        }
        return tooltipLines;
    }

    /// <summary>Rows with no value for the sort column sink to the end regardless of direction.</summary>
    private static List<ChartPointDto> OrderPoints(List<(ChartPointDto Point, IComparable? SortKey)> points, bool descending)
    {
        var ordered = points.OrderBy(entry => entry.SortKey is null ? 1 : 0);
        return (descending
                ? ordered.ThenByDescending(entry => entry.SortKey)
                : ordered.ThenBy(entry => entry.SortKey))
            .Select(entry => entry.Point)
            .ToList();
    }

    /// <summary>
    /// Narrows to rows that carry a plottable value for the axis column — a string for a text
    /// axis, a date for a date axis, a number otherwise — kept as an expression EF can translate.
    /// </summary>
    private static IQueryable<DatasetRow> RequireAxisValue(IQueryable<DatasetRow> rows, int columnId, DatasetColumnType? type) => type switch
    {
        DatasetColumnType.String => rows.Where(r => r.Cells.Any(c => c.ColumnId == columnId && c.StringValue != null)),
        DatasetColumnType.DateTime => rows.Where(r => r.Cells.Any(c => c.ColumnId == columnId && c.DateValue != null)),
        _ => rows.Where(r => r.Cells.Any(c => c.ColumnId == columnId && c.NumberValue != null))
    };

    /// <summary>
    /// The axis coordinate for a cell: the trimmed string for a text axis, epoch milliseconds for
    /// a date axis (which the client plots on an echarts time axis), else the raw number.
    /// </summary>
    private static object AxisValue(DatasetCell cell, DatasetColumnType? type) => type switch
    {
        DatasetColumnType.String => cell.StringValue!.Trim(),
        DatasetColumnType.DateTime => (cell.DateValue!.Value - DateTime.UnixEpoch).TotalMilliseconds,
        _ => cell.NumberValue!.Value
    };

    /// <summary>
    /// A row's value for a point chart's sort column — typed like an axis value, but (unlike one)
    /// tolerating a missing cell, since a sort column isn't required to be bound on every row. A
    /// missing value reads as null, which the caller sinks to the end of the draw order.
    /// </summary>
    private static IComparable? SortValue(DatasetCell? cell, DatasetColumnType? type)
    {
        if (cell is null)
        {
            return null;
        }

        return type switch
        {
            DatasetColumnType.String => cell.StringValue?.Trim(),
            DatasetColumnType.DateTime => cell.DateValue is { } date ? date : null,
            DatasetColumnType.Bool => cell.BoolValue is { } flag ? flag : null,
            _ => cell.NumberValue is { } number ? number : null
        };
    }

    /// <summary>
    /// A series' ordinary-least-squares trend line, or null when there's nothing to fit — fewer
    /// than two points, or every point sharing the same X (an undefined slope). The endpoints are
    /// the fitted line's Y at the series' own X extremes, ready for the client to draw a segment
    /// through; <see cref="TrendLineDto.RSquared"/> says how well it actually fits.
    /// </summary>
    private static TrendLineDto? ComputeTrendLine(IEnumerable<ChartPointDto> points)
    {
        var pairs = points.Select(point => ((double)point.X, (double)point.Y)).ToList();
        if (pairs.Count < 2)
        {
            return null;
        }

        var xMean = pairs.Average(pair => pair.Item1);
        var yMean = pairs.Average(pair => pair.Item2);
        var ssXY = pairs.Sum(pair => (pair.Item1 - xMean) * (pair.Item2 - yMean));
        var ssXX = pairs.Sum(pair => (pair.Item1 - xMean) * (pair.Item1 - xMean));
        if (ssXX == 0)
        {
            return null;
        }

        var slope = ssXY / ssXX;
        var intercept = yMean - slope * xMean;
        var ssYY = pairs.Sum(pair => (pair.Item2 - yMean) * (pair.Item2 - yMean));
        // Every Y identical too: the (horizontal) line fits perfectly.
        var rSquared = ssYY == 0 ? 1d : (ssXY * ssXY) / (ssXX * ssYY);

        var xMin = pairs.Min(pair => pair.Item1);
        var xMax = pairs.Max(pair => pair.Item1);
        return new TrendLineDto
        {
            X1 = xMin, Y1 = slope * xMin + intercept,
            X2 = xMax, Y2 = slope * xMax + intercept,
            Slope = slope, Intercept = intercept, RSquared = rSquared
        };
    }
}
