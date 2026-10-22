using Reporting.Abstractions;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Each bound numeric column's values binned into equal ranges, with each bin's frequency as a bar height. A
/// series column or several value columns overlay several distributions, all sharing one set of bin edges so
/// they line up on one axis.
/// </summary>
public class HistogramQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands, DatasetResolver resolver)
{
    public async Task<HistogramQueryResultDto?> QueryForHistogramAsync(int id, HistogramQueryDto dto)
    {
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var measures = Measures(dto, columnsByRef);

        // Bands sit on the binned (X) axis; with several measures the first stands in for a tolerance filter.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, measures.FirstOrDefault()?.RefId ?? Guid.Empty, null);
        var filtered = await WidgetRowFilter.FilterAsync(db, resolved, columnsByRef, dto.Filter, toleranceByColumn);

        var result = new HistogramQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            TotalRowCount = filtered.TotalRowCount,
            MatchedRowCount = filtered.MatchedRowCount
        };
        var resolvedBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds);
        if (measures.Count > 0 && await ApplyBinsAsync(result, filtered.Matching, dto, measures, columnsByRef, dataset.Columns, resolvedBands))
        {
            result.ToleranceBands = resolvedBands;
        }
        return result;
    }

    /// <summary>False, leaving <paramref name="result"/> empty, when no measure has a value.</summary>
    private static async Task<bool> ApplyBinsAsync(
        HistogramQueryResultDto result, IQueryable<DatasetRow> matching, HistogramQueryDto dto, List<DatasetColumn> measures,
        Dictionary<Guid, DatasetColumn> columnsByRef, IEnumerable<DatasetColumn> allColumns, List<ResolvedToleranceBandDto> bands)
    {
        var seriesColumn = dto.SeriesColumnId is { } seriesColumnRef ? columnsByRef.GetValueOrDefault(seriesColumnRef) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        var (perMeasure, truncated, scannedCount) = await ScanMeasuresAsync(matching, measures, seriesId);
        var allValues = perMeasure.SelectMany(m => m.Projected.Select(p => p.Value)).ToList();
        if (allValues.Count == 0)
        {
            return false;
        }

        var (min, max) = Range(dto, allValues, bands);
        var edges = HistogramBinning.Edges(allValues, min, max, dto.BinMode, dto.BinCount, dto.BinWidth, fixedStart: dto.RangeMin is not null);
        var bins = HistogramBinning.Bins(edges);
        var binWidth = edges[1] - edges[0];

        var fixedRange = dto.RangeMin is not null || dto.RangeMax is not null;
        var excluded = fixedRange ? ExcludeOutOfRange(perMeasure, min, max) : 0;

        // Measure-major, so a measure's split series sit together.
        var series = perMeasure
            .SelectMany(measure => HistogramSeries.ForMeasure(measure, edges, bins.Count, binWidth, dto, seriesColumn))
            .ToList();

        await HistogramTooltips.ApplyAsync(
            matching, dto, measures, series, seriesId, edges, bins.Count, fixedRange ? (min, max) : null, columnsByRef, allColumns);

        result.Bins = bins;
        result.Series = series;
        result.Truncated = truncated;
        result.ScannedRowCount = scannedCount;
        result.ExcludedCount = excluded;
        return true;
    }

    /// <summary>In request order; the deprecated single ValueColumnId folds in when the list is empty.</summary>
    private static List<DatasetColumn> Measures(HistogramQueryDto dto, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        var valueColumnIds = dto.ValueColumnIds.Count > 0 ? dto.ValueColumnIds : new List<Guid> { dto.ValueColumnId };
        return valueColumnIds
            .Select(valueColumnId => columnsByRef.GetValueOrDefault(valueColumnId))
            .Where(c => c is not null)
            .Select(c => c!)
            .ToList();
    }

    /// <summary>Each measure has its own null pattern so is scanned alone; the values are pooled for the edges.</summary>
    private static async Task<(List<HistogramMeasureValues> PerMeasure, bool Truncated, int ScannedCount)> ScanMeasuresAsync(
        IQueryable<DatasetRow> matching, List<DatasetColumn> measures, int seriesId)
    {
        var perMeasure = new List<HistogramMeasureValues>();
        var truncated = false;
        var scannedCount = 0;
        foreach (var measure in measures)
        {
            var (projected, measureTruncated, measureScanned) = await HistogramScan.ValuesAsync(matching, seriesId, measure.Id);
            perMeasure.Add(new HistogramMeasureValues(measure, projected));
            truncated |= measureTruncated;
            scannedCount += measureScanned;
        }
        return (perMeasure, truncated, scannedCount);
    }

    /// <summary>
    /// A fixed range if valid, else the data extremes widened to the spec limits so every limit lands on the
    /// bin axis; a half-typed bound can't blank the chart.
    /// </summary>
    private static (double Min, double Max) Range(HistogramQueryDto dto, List<double> allValues, List<ResolvedToleranceBandDto> bands)
    {
        var (dataMin, dataMax) = HistogramLimitRange.Extend(allValues.Min(), allValues.Max(), bands);
        var min = dto.RangeMin ?? dataMin;
        var max = dto.RangeMax ?? dataMax;
        if (double.IsNaN(min) || double.IsNaN(max) || min >= max)
        {
            return (dataMin, dataMax);
        }
        return (min, max);
    }

    /// <summary>A fixed range zooms in: values outside it are left out and counted, not piled into the end bins.</summary>
    private static int ExcludeOutOfRange(List<HistogramMeasureValues> perMeasure, double min, double max)
    {
        var excluded = 0;
        for (var m = 0; m < perMeasure.Count; m++)
        {
            var inRange = perMeasure[m].Projected.Where(p => p.Value >= min && p.Value <= max).ToList();
            excluded += perMeasure[m].Projected.Count - inRange.Count;
            perMeasure[m] = perMeasure[m] with { Projected = inRange };
        }
        return excluded;
    }
}
