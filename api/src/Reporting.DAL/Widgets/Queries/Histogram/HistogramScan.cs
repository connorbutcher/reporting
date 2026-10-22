using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>Every value must be pulled to be binned, so only the needed scalars are scanned, capped.</summary>
internal static class HistogramScan
{
    public const int MaxRows = ScanCapping.MaxScanRows;

    /// <summary>Only rows with a numeric value can be binned.</summary>
    public static async Task<(List<(string Series, double Value)> Projected, bool Truncated, int ScannedCount)> ValuesAsync(
        IQueryable<DatasetRow> matching, int seriesId, int valueId)
    {
        var scanned = await CellPivot.Of(matching, seriesId, valueId)
            .Where(p => p.N1 != null)
            .OrderBy(p => p.RowId)
            .Take(MaxRows + 1)
            .Select(p => new { Series = p.T0, Value = p.N1 })
            .ToListAsync();

        var truncated = ScanCapping.TrimToScanCap(scanned, MaxRows);
        var projected = scanned
            .Select(r => (Series: (r.Series ?? "").Trim(), Value: r.Value ?? 0d))
            .ToList();
        return (projected, truncated, scanned.Count);
    }

    /// <summary>A tooltip column's sum and count per bin, per series key, bucketed with the bars' edges.</summary>
    public static async Task<Dictionary<string, (double Sum, int Count)[]>> BinTotalsAsync(
        IQueryable<DatasetRow> matching, int seriesId, int valueId, int tooltipId, List<double> edges, int binCount, (double Min, double Max)? range)
    {
        var scanned = await CellPivot.Of(matching, seriesId, valueId, tooltipId)
            .Where(p => p.N1 != null && p.N2 != null)
            .OrderBy(p => p.RowId)
            .Take(MaxRows)
            .Select(p => new { Series = p.T0, Value = p.N1, Tooltip = p.N2 })
            .ToListAsync();

        var totals = new Dictionary<string, (double Sum, int Count)[]>();
        foreach (var row in scanned)
        {
            var value = row.Value ?? 0d;
            if (range is { } r && (value < r.Min || value > r.Max))
            {
                continue;
            }
            var key = (row.Series ?? "").Trim();
            if (!totals.TryGetValue(key, out var perBin))
            {
                perBin = new (double, int)[binCount];
                totals[key] = perBin;
            }
            var bin = HistogramBinning.Index(value, edges, binCount);
            perBin[bin] = (perBin[bin].Sum + (row.Tooltip ?? 0d), perBin[bin].Count + 1);
        }
        return totals;
    }
}
