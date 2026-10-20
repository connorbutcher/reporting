using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Values shaped for a histogram: filtered, then each bound numeric column's values binned into
/// equal ranges with each bin's frequency returned as a bar height. Like a box plot every value
/// must be pulled to be binned, so the lightweight (series, value) scalars are scanned back
/// (capped) and binned in memory. A series column, if set, overlays a distribution per series;
/// several value columns overlay a distribution per measure too — either way every series shares
/// one set of bin edges, pooled across whatever is plotted, so they line up on one axis.
/// </summary>
public class HistogramQueryService(ReportingDbContext db, ChartToleranceBands toleranceBands, DatasetResolver resolver)
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
        var resolved = await resolver.ResolveAsync(id);
        if (resolved is null)
        {
            return null;
        }
        var dataset = resolved.Physical;

        var empty = new HistogramQueryResultDto { Id = resolved.Id, Name = resolved.Name };

        var columnsByRef = dataset.Columns.ToDictionary(c => c.RefId);

        // The measures to distribute, in request order — several become several distributions
        // sharing one set of bin edges. The deprecated single ValueColumnId folds in when the list is empty.
        var valueColumnIds = dto.ValueColumnIds.Count > 0 ? dto.ValueColumnIds : new List<Guid> { dto.ValueColumnId };
        var measures = valueColumnIds
            .Select(valueColumnId => columnsByRef.GetValueOrDefault(valueColumnId))
            .Where(c => c is not null)
            .Select(c => c!)
            .ToList();

        // Bands sit on the value (X) axis — the binned variable — so a tolerance filter reuses that
        // band to narrow rows by the value column before they're binned. With several measures the
        // first stands in — a per-measure tolerance filter isn't expressible here.
        var bounds = await toleranceBands.ResolveAsync(dto.ToleranceBands);
        var toleranceByColumn = ChartToleranceBands.ByAxisColumn(dto.ToleranceBands, bounds, measures.FirstOrDefault()?.RefId ?? Guid.Empty, null);
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == dataset.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = FilterTranslator.Apply(all, dto.Filter, columnsByRef, toleranceByColumn, operatorCatalogue);
        var (totalRowCount, matchedRowCount) = await RowCounts.CountRowsAsync(all, matching);
        empty.TotalRowCount = totalRowCount;
        empty.MatchedRowCount = matchedRowCount;

        // Nothing bound yet yields an empty chart, the same graceful no-op the other charts give.
        if (measures.Count == 0)
        {
            return empty;
        }

        var seriesColumn = dto.SeriesColumnId is { } seriesColumnRef ? columnsByRef.GetValueOrDefault(seriesColumnRef) : null;
        var seriesId = seriesColumn?.Id ?? 0;

        // Each measure is scanned on its own — different measures can have different null patterns,
        // so they can't share one scan — but every measure's values are pooled before the bin edges
        // are picked, so the shared axis spans whatever is plotted (the histogram counterpart of a
        // bar chart sharing one category axis across its measures).
        var perMeasure = new List<(DatasetColumn Column, List<(string Series, double Value)> Projected)>();
        var truncated = false;
        var scannedCount = 0;
        foreach (var measure in measures)
        {
            var (projected, measureTruncated, measureScanned) = await ScanAndProjectAsync(matching, seriesId, measure.Id);
            perMeasure.Add((measure, projected));
            truncated |= measureTruncated;
            scannedCount += measureScanned;
        }

        var allValues = perMeasure.SelectMany(m => m.Projected.Select(p => p.Value)).ToList();
        if (allValues.Count == 0)
        {
            return empty;
        }

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

        var edges = BinEdges(allValues, min, max, dto.BinMode, dto.BinCount, dto.BinWidth, fixedStart: dto.RangeMin is not null);
        var bins = BuildBins(edges);
        var binWidth = edges[1] - edges[0];

        // A fixed range zooms in: values outside it are left out (and counted) rather than piled
        // into the end bins, which would inflate them. An auto-fit range holds every value anyway.
        var excluded = 0;
        if (dto.RangeMin is not null || dto.RangeMax is not null)
        {
            for (var m = 0; m < perMeasure.Count; m++)
            {
                var inRange = perMeasure[m].Projected.Where(p => p.Value >= min && p.Value <= max).ToList();
                excluded += perMeasure[m].Projected.Count - inRange.Count;
                perMeasure[m] = (perMeasure[m].Column, inRange);
            }
        }

        // One set of series per measure, measure-major so a measure's split series sit together —
        // mirrors a bar chart's measure-major series ordering.
        var series = perMeasure
            .SelectMany(measure => SeriesForMeasure(measure.Column, measure.Projected, edges, bins.Count, binWidth, dto, seriesColumn))
            .ToList();

        // Tooltip columns: each one averaged over the rows in each bin of each series.
        var fixedRange = dto.RangeMin is not null || dto.RangeMax is not null;
        foreach (var setting in dto.TooltipColumns)
        {
            var column = BarChartQueryService.ResolveTooltipColumn(setting, columnsByRef, dataset.Columns);
            if (column?.Type is not (DatasetColumnType.Int or DatasetColumnType.Double))
            {
                continue;
            }
            foreach (var measure in measures)
            {
                var averages = await BinAveragesAsync(matching, seriesId, measure.Id, column.Id, edges, bins.Count, fixedRange ? (min, max) : null);
                foreach (var seriesDto in series.Where(s => s.ValueColumnId == measure.RefId))
                {
                    var perBin = averages.GetValueOrDefault(seriesDto.Key);
                    if (seriesDto.TooltipLines.Count == 0)
                    {
                        seriesDto.TooltipLines = bins.Select(_ => new List<string>()).ToList();
                    }
                    for (var b = 0; b < bins.Count; b++)
                    {
                        if (perBin is not null && perBin[b].Count > 0)
                        {
                            var formatted = CellFormatter.Number(perBin[b].Sum / perBin[b].Count, column.GetConfig() as NumericColumnConfig);
                            seriesDto.TooltipLines[b].Add($"{setting.Prefix}{formatted}{setting.Suffix}");
                        }
                    }
                }
            }
        }

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

    /// <summary>One measure's series — one per distinct series key its scan produced, each binned
    /// into the shared edges.</summary>
    private static IEnumerable<HistogramSeriesDto> SeriesForMeasure(
        DatasetColumn measureColumn,
        List<(string Series, double Value)> projected,
        List<double> edges,
        int binCount,
        double binWidth,
        HistogramQueryDto dto,
        DatasetColumn? seriesColumn)
    {
        var orderedSeriesKeys = projected
            .Select(p => p.Series)
            .Distinct()
            .OrderBy(series => series, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return orderedSeriesKeys.Select(seriesKey =>
        {
            var seriesDto = BuildHistogramSeries(seriesKey, projected, edges, binCount, binWidth, dto, seriesColumn);
            seriesDto.ValueColumnId = measureColumn.RefId;
            seriesDto.ValueColumnLabel = measureColumn.Name;
            return seriesDto;
        });
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

    /// <summary>
    /// The average of a tooltip column over the rows in each bin, per series key: one capped scan of
    /// (series, binned value, tooltip value), bucketed in memory with the same edges as the bars.
    /// </summary>
    private static async Task<Dictionary<string, (double Sum, int Count)[]>> BinAveragesAsync(
        IQueryable<DatasetRow> matching, int seriesId, int valueId, int tooltipId, List<double> edges, int binCount, (double Min, double Max)? range)
    {
        var scanned = await matching
            .Where(r => r.Cells.Any(c => c.ColumnId == valueId && c.NumberValue != null)
                && r.Cells.Any(c => c.ColumnId == tooltipId && c.NumberValue != null))
            .OrderBy(r => r.Id)
            .Take(MaxHistogramScanRows)
            .Select(r => new
            {
                Series = r.Cells.Where(c => c.ColumnId == seriesId).Select(c => c.StringValue).FirstOrDefault(),
                Value = r.Cells.Where(c => c.ColumnId == valueId).Select(c => c.NumberValue).FirstOrDefault(),
                Tooltip = r.Cells.Where(c => c.ColumnId == tooltipId).Select(c => c.NumberValue).FirstOrDefault()
            })
            .ToListAsync();

        var averages = new Dictionary<string, (double Sum, int Count)[]>();
        foreach (var row in scanned)
        {
            var value = row.Value ?? 0d;
            if (range is { } r && (value < r.Min || value > r.Max))
            {
                continue;
            }
            var key = (row.Series ?? "").Trim();
            if (!averages.TryGetValue(key, out var perBin))
            {
                perBin = new (double, int)[binCount];
                averages[key] = perBin;
            }
            var bin = BinIndex(value, edges, binCount);
            perBin[bin] = (perBin[bin].Sum + (row.Tooltip ?? 0d), perBin[bin].Count + 1);
        }
        return averages;
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
        var seriesValues = new List<double>();
        foreach (var (key, value) in projected)
        {
            if (key != seriesKey)
            {
                continue;
            }
            counts[BinIndex(value, edges, binCount)]++;
            seriesValues.Add(value);
            total++;
        }
        var mean = total > 0 ? seriesValues.Average() : 0d;

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

        return new HistogramSeriesDto
        {
            Key = seriesKey,
            Label = SeriesLabels.Format(seriesColumn, seriesKey),
            Drill = SeriesLabels.Drill(seriesColumn, seriesKey),
            Values = values,
            Mean = mean,
            StdDev = Statistics.StdDev(seriesValues, mean),
            Count = total
        };
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
    /// count divides the range evenly; a fixed width tiles bins of exactly that width, starting on a
    /// multiple of it (or on a fixed range's start) so edges read as round numbers, with the last bin
    /// running past the maximum if need be; Auto picks a count with the Freedman–Diaconis rule
    /// (falling back to Sturges when the IQR is zero). A degenerate range (all values equal) yields a
    /// single unit-wide bin. The bin count is capped either way — for a fixed width by widening the bins.
    /// </summary>
    private static List<double> BinEdges(
        List<double> values, double min, double max, HistogramBinMode mode, int binCount, double binWidth, bool fixedStart = false)
    {
        // All values equal (or a collapsed range): one bin, widened to a unit so it draws.
        if (max <= min && !(mode == HistogramBinMode.Width && binWidth > 0))
        {
            return new List<double> { min, min + 1 };
        }

        if (mode == HistogramBinMode.Width && binWidth > 0)
        {
            var width = binWidth;
            var start = fixedStart ? min : Math.Floor(min / width) * width;
            var widthCount = Math.Max(1, (int)Math.Ceiling((max - start) / width));
            // A value sitting exactly on the last edge still belongs in the last bin, so no extra bin for it.
            if (widthCount > MaxHistogramBins)
            {
                widthCount = MaxHistogramBins;
                width = (max - start) / widthCount;
            }
            var widthEdges = new List<double>(widthCount + 1);
            for (var i = 0; i <= widthCount; i++)
            {
                widthEdges.Add(start + i * width);
            }
            return widthEdges;
        }

        var range = max - min;
        int count;
        if (mode == HistogramBinMode.Count)
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
