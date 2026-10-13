using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Values shaped for a histogram: filtered, then the chosen numeric column's values binned into
/// equal ranges with each bin's frequency returned as a bar height. Like a box plot every value
/// must be pulled to be binned, so the lightweight (series, value) scalars are scanned back
/// (capped) and binned in memory. A series column, if set, overlays a distribution per series;
/// the bins are shared across every series so they line up on one axis.
/// </summary>
public class HistogramQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands)
{
    /// <summary>
    /// Ceiling on rows scanned for one histogram query. Like a box plot every value must be pulled
    /// to be binned, so a runaway dataset is capped here — far past any sample size where the shape
    /// of the distribution would meaningfully shift.
    /// </summary>
    private const int MaxHistogramScanRows = 200_000;

    /// <summary>Ceiling on the number of bins a histogram can produce, so a tiny bin width (or a
    /// huge range) can't fan out into an unbounded axis.</summary>
    private const int MaxHistogramBins = 500;

    public async Task<HistogramQueryResultDto?> QueryForHistogramAsync(int id, HistogramQueryDto dto)
    {
        var dataset = await db.Datasets.AsNoTracking().Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        var empty = new HistogramQueryResultDto { Id = dataset.Id, Name = dataset.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // Bands sit on the value (X) axis — the binned variable — so a tolerance filter reuses that
        // band to narrow rows by the value column before they're binned.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, dto.ValueColumnId, null);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var all = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, toleranceByColumn, operatorCatalogue);
        var (totalRowCount, matchedRowCount) = await RowCounts.CountRowsAsync(all, matching);
        empty.TotalRowCount = totalRowCount;
        empty.MatchedRowCount = matchedRowCount;

        // Nothing bound yet yields an empty chart, the same graceful no-op the other charts give.
        var valueColumn = columnsByRef.GetValueOrDefault(dto.ValueColumnId);
        if (valueColumn is null)
        {
            return empty;
        }
        var valueId = valueColumn.Id;

        var seriesColumn = dto.SeriesColumnId is { } seriesColumnRef ? columnsByRef.GetValueOrDefault(seriesColumnRef) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        var (projected, truncated, scannedCount) = await ScanAndProjectAsync(matching, seriesId, valueId);
        if (projected.Count == 0)
        {
            return empty;
        }

        var allValues = projected.Select(p => p.Value).ToList();
        var dataMin = allValues.Min();
        var dataMax = allValues.Max();

        // Honour any fixed range, else fit to the data. A reversed or degenerate range falls back to
        // the data extremes so a half-typed bound can't blank the chart.
        var min = dto.RangeMin ?? dataMin;
        var max = dto.RangeMax ?? dataMax;
        if (double.IsNaN(min) || double.IsNaN(max) || min >= max)
        {
            min = dataMin;
            max = dataMax;
        }

        var edges = BinEdges(allValues, min, max, dto.BinMode, dto.BinCount, dto.BinWidth);
        var bins = BuildBins(edges);
        var binWidth = edges[1] - edges[0];

        var orderedSeriesKeys = projected
            .Select(p => p.Series)
            .Distinct()
            .OrderBy(series => series, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var series = orderedSeriesKeys
            .Select(seriesKey => BuildHistogramSeries(seriesKey, projected, edges, bins.Count, binWidth, dto, seriesColumn))
            .ToList();

        return new HistogramQueryResultDto
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Bins = bins,
            Series = series,
            ToleranceBands = ChartToleranceBands.Resolved(dto.ToleranceBands, bounds),
            TotalRowCount = totalRowCount,
            MatchedRowCount = matchedRowCount,
            Truncated = truncated,
            ScannedRowCount = scannedCount
        };
    }

    /// <summary>
    /// Pulls back only the (series, value) scalars a histogram needs, capped. Only rows carrying a
    /// numeric value can be binned; a row without one simply doesn't count.
    /// </summary>
    private static async Task<(List<(string Series, double Value)> Projected, bool Truncated, int ScannedCount)> ScanAndProjectAsync(
        IQueryable<DatasetRow> matching, int seriesId, int valueId)
    {
        var rowsQuery = matching.Where(r => r.Cells.Any(c => c.ColumnId == valueId && c.NumberValue != null));

        var scanned = await rowsQuery
            .OrderBy(r => r.Id)
            .Take(MaxHistogramScanRows + 1)
            .Select(r => new
            {
                Series = r.Cells.Where(c => c.ColumnId == seriesId).Select(c => c.StringValue).FirstOrDefault(),
                Value = r.Cells.Where(c => c.ColumnId == valueId).Select(c => c.NumberValue).FirstOrDefault()
            })
            .ToListAsync();

        var truncated = ScanCapping.TrimToScanCap(scanned, MaxHistogramScanRows);

        var projected = scanned
            .Select(r => (Series: (r.Series ?? "").Trim(), Value: r.Value ?? 0d))
            .ToList();

        return (projected, truncated, scanned.Count);
    }

    /// <summary>The client-facing bins for a set of edges — each one's range and its axis label.</summary>
    private static List<HistogramBinDto> BuildBins(List<double> edges)
    {
        var bins = new List<HistogramBinDto>(edges.Count - 1);
        for (var i = 0; i < edges.Count - 1; i++)
        {
            bins.Add(new HistogramBinDto
            {
                Lower = edges[i],
                Upper = edges[i + 1],
                Label = $"{FormatEdge(edges[i])} – {FormatEdge(edges[i + 1])}"
            });
        }
        return bins;
    }

    /// <summary>
    /// One series' bar heights: each value's raw count in its bin, then turned into what the bar
    /// should show — raw, a fraction of the series' own total, or a density — and optionally
    /// accumulated so the chart draws a cumulative distribution.
    /// </summary>
    private static HistogramSeriesDto BuildHistogramSeries(
        string seriesKey,
        List<(string Series, double Value)> projected,
        List<double> edges,
        int binCount,
        double binWidth,
        HistogramQueryDto dto,
        DatasetColumn? seriesColumn)
    {
        var counts = new double[binCount];
        var total = 0;
        foreach (var (key, value) in projected)
        {
            if (key != seriesKey)
            {
                continue;
            }
            counts[BinIndex(value, edges, binCount)]++;
            total++;
        }

        var values = new List<double>(binCount);
        var running = 0d;
        foreach (var count in counts)
        {
            var shown = dto.Normalize switch
            {
                HistogramNormalize.Frequency => total > 0 ? count / total : 0,
                HistogramNormalize.Density => total > 0 && binWidth > 0 ? count / (total * binWidth) : 0,
                _ => count
            };
            running += shown;
            values.Add(dto.Cumulative ? running : shown);
        }

        return new HistogramSeriesDto { Label = SeriesLabels.Format(seriesColumn, seriesKey), Values = values };
    }

    /// <summary>The bin a value falls into: the first bin at or below the lowest edge, the last at
    /// or above the highest (so the maximum lands in the last bin rather than off the end), else a
    /// direct division since the edges are equal-width — no scan needed.</summary>
    private static int BinIndex(double value, List<double> edges, int binCount)
    {
        if (value <= edges[0])
        {
            return 0;
        }
        if (value >= edges[^1])
        {
            return binCount - 1;
        }

        var index = (int)((value - edges[0]) / (edges[1] - edges[0]));
        return Math.Clamp(index, 0, binCount - 1);
    }

    /// <summary>
    /// The ascending bin edges spanning [<paramref name="min"/>, <paramref name="max"/>]. A fixed
    /// count divides the range evenly; a fixed width tiles bins across it; Auto picks a count with
    /// the Freedman–Diaconis rule (falling back to Sturges when the IQR is zero). A degenerate range
    /// (all values equal) yields a single unit-wide bin. The bin count is capped either way.
    /// </summary>
    private static List<double> BinEdges(
        List<double> values, double min, double max, HistogramBinMode mode, int binCount, double binWidth)
    {
        // All values equal (or a collapsed range): one bin, widened to a unit so it draws.
        if (max <= min)
        {
            return new List<double> { min, min + 1 };
        }

        var range = max - min;
        int count;
        if (mode == HistogramBinMode.Width)
        {
            var width = binWidth > 0 ? binWidth : range;
            count = (int)Math.Ceiling(range / width);
        }
        else if (mode == HistogramBinMode.Count)
        {
            count = binCount;
        }
        else
        {
            count = AutoBinCount(values, range);
        }

        count = Math.Clamp(count, 1, MaxHistogramBins);

        var step = range / count;
        var edges = new List<double>(count + 1);
        for (var i = 0; i <= count; i++)
        {
            edges.Add(min + i * step);
        }
        // Pin the last edge exactly on max so a fixed width that doesn't divide evenly still closes on it.
        edges[^1] = max;
        return edges;
    }

    /// <summary>The Freedman–Diaconis bin count for a set of values over a range, falling back to
    /// Sturges when the interquartile range is zero (so a spiked distribution still bins sensibly).</summary>
    private static int AutoBinCount(List<double> values, double range)
    {
        var sampleSize = values.Count;
        var sorted = values.OrderBy(value => value).ToList();
        var iqr = Statistics.Quantile(sorted, 0.75) - Statistics.Quantile(sorted, 0.25);
        if (iqr > 0)
        {
            var width = 2 * iqr / Math.Cbrt(sampleSize);
            if (width > 0)
            {
                return Math.Max(1, (int)Math.Ceiling(range / width));
            }
        }
        // Sturges: k = ceil(log2 n) + 1.
        return Math.Max(1, (int)Math.Ceiling(Math.Log2(Math.Max(1, sampleSize)) + 1));
    }

    /// <summary>Formats a bin edge for its axis label — trimmed to a few significant decimals.</summary>
    private static string FormatEdge(double value) =>
        value.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture);
}
