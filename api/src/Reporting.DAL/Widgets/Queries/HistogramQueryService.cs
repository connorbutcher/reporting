using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
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

        var empty = new HistogramQueryResultDto { Id = resolved.Id, Name = resolved.Name };
        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);
        var measures = Measures(dto, columnsByRef);

        // Bands sit on the binned (X) axis; with several measures the first stands in for a tolerance filter.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, measures.FirstOrDefault()?.RefId ?? Guid.Empty, null);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, toleranceByColumn, operatorCatalogue);
        var (totalRowCount, matchedRowCount) = await RowCounts.CountRowsAsync(all, matching);
        empty.TotalRowCount = totalRowCount;
        empty.MatchedRowCount = matchedRowCount;

        if (measures.Count == 0)
        {
            return empty;
        }

        var seriesColumn = dto.SeriesColumnId is { } seriesColumnRef ? columnsByRef.GetValueOrDefault(seriesColumnRef) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        var (perMeasure, truncated, scannedCount) = await ScanMeasuresAsync(matching, measures, seriesId);
        var allValues = perMeasure.SelectMany(m => m.Projected.Select(p => p.Value)).ToList();
        if (allValues.Count == 0)
        {
            return empty;
        }

        var (min, max) = Range(dto, allValues);
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
            matching, dto, measures, series, seriesId, edges, bins.Count, fixedRange ? (min, max) : null, columnsByRef, dataset.Columns);

        return new HistogramQueryResultDto
        {
            Id = resolved.Id,
            Name = resolved.Name,
            Bins = bins,
            Series = series,
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount,
            Truncated = truncated,
            ScannedRowCount = scannedCount,
            ExcludedCount = excluded
        };
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

    /// <summary>A fixed range if valid, else the data extremes, so a half-typed bound can't blank the chart.</summary>
    private static (double Min, double Max) Range(HistogramQueryDto dto, List<double> allValues)
    {
        var dataMin = allValues.Min();
        var dataMax = allValues.Max();
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
