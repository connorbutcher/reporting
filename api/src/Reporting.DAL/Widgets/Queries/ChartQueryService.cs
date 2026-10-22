using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Rows shaped for a scatter or line chart: filtered, grouped into series, paired with resolved tolerance
/// bounds and pre-formatted tooltip lines, so the client only builds the ECharts option.
/// </summary>
public class ChartQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands, DatasetResolver resolver)
{
    /// <summary>Past this the payload isn't worth rendering; the response says it was capped and the client thins further.</summary>
    private const int MaxChartPoints = 20_000;

    public async Task<ChartQueryResultDto?> QueryForChartAsync(int id, ChartQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // The bands draw reference lines, and a tolerance filter reuses the band on the filtered column's axis.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, dto.XColumnId, dto.YColumnId);
        var filtered = await WidgetRowFilter.FilterAsync(db, resolved, columnsByRef, dto.Filter, toleranceByColumn);
        var matching = filtered.Matching;

        var sort = dto.Sort ?? new ChartSort();
        var columns = PointColumns.Resolve(dto, sort, columnsByRef, dataset.Columns);
        var result = new ChartQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = filtered.TotalRowCount,
            MatchedRowCount = filtered.MatchedRowCount,
        };

        if (dto.Aggregate is { } aggregate && columns.X is { } xColumn)
        {
            await ApplyAggregatedAsync(result, dto, matching, columns, xColumn, aggregate, sort);
        }
        else
        {
            await ApplyRowPointsAsync(result, dto, matching, columns, sort);
        }
        return result;
    }

    /// <summary>Every row sharing an X (per series) reduced to one point, in SQL.</summary>
    private static async Task ApplyAggregatedAsync(
        ChartQueryResultDto result, ChartQueryDto dto, IQueryable<DatasetRow> matching, PointColumns columns,
        DatasetColumn xColumn, Aggregate aggregate, ChartSort sort)
    {
        var aggregated = await PointAggregation.AggregateAsync(matching, xColumn, columns.Y, columns.Series, aggregate, dto.XGrouping);
        var trend = dto.ShowTrendLine && PointAxes.IsNumeric(xColumn.Type);
        result.Series = aggregated
            .GroupBy(point => point.Series)
            .OrderBy(group => group.Key, StringComparer.OrdinalIgnoreCase)
            .Select(group => AggregatedSeries(group.Key, group.ToList(), columns.Series, sort, trend))
            .ToList();
        result.TotalPoints = aggregated.Count;
        result.Truncated = aggregated.Count > MaxChartPoints;
    }

    private static ChartSeriesDto AggregatedSeries(
        string series, List<AggregatedPoint> group, DatasetColumn? seriesColumn, ChartSort sort, bool trend)
    {
        var points = group.Select(point => (point.Point, (IComparable?)(IComparable)point.Point.X)).ToList();
        return new ChartSeriesDto
        {
            Label = SeriesLabels.Format(seriesColumn, series),
            Points = PointAxes.Order(points, sort.Descending).Take(MaxChartPoints).ToList(),
            TrendLine = trend ? TrendLines.Compute(points.Select(entry => entry.Point)) : null
        };
    }

    /// <summary>
    /// One point per row with a value on both axes. Past the cap the rows are thinned evenly along X rather
    /// than cut off after the first stored.
    /// </summary>
    private static async Task ApplyRowPointsAsync(
        ChartQueryResultDto result, ChartQueryDto dto, IQueryable<DatasetRow> matching, PointColumns columns, ChartSort sort)
    {
        var plottable = PointAxes.RequireValue(matching, columns.XId, columns.X?.Type);
        plottable = PointAxes.RequireValue(plottable, columns.YId, columns.Y?.Type);

        var total = await plottable.CountAsync();
        var sampled = total > MaxChartPoints;
        var selected = plottable;
        if (sampled)
        {
            var ids = await PointSampling.EvenIdsAsync(plottable, columns.XId, columns.X?.Type, MaxChartPoints);
            selected = plottable.Where(r => ids.Contains(r.Id));
        }

        var neededIds = columns.NeededIds();
        var rows = await selected
            .OrderBy(r => r.Id)
            .Take(MaxChartPoints)
            .Include(r => r.Cells.Where(c => neededIds.Contains(c.ColumnId)))
            .AsNoTracking()
            .ToListAsync();

        // A trend line needs numbers on both axes.
        var trend = dto.ShowTrendLine && PointAxes.IsNumeric(columns.X?.Type) && PointAxes.IsNumeric(columns.Y?.Type);
        result.Series = PointGroups.Build(rows, columns).Select(group => new ChartSeriesDto
        {
            Label = group.Key,
            Points = PointAxes.Order(group.Value, sort.Descending),
            TrendLine = trend ? TrendLines.Compute(group.Value.Select(entry => entry.Point)) : null
        }).ToList();
        result.TotalPoints = total;
        result.Truncated = sampled;
        result.Sampled = sampled;
    }
}
