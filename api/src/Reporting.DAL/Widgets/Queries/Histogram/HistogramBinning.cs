using System.Globalization;
using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

internal static class HistogramBinning
{
    /// <summary>Stops a tiny bin width or a huge range fanning out into an unbounded axis.</summary>
    public const int MaxBins = 500;

    /// <summary>
    /// Ascending edges spanning [min, max]. A fixed count divides the range evenly; a fixed width tiles bins
    /// of that width from a round start (or a fixed range's start); Auto uses Freedman–Diaconis. A degenerate
    /// range gives one unit-wide bin, and the count is capped, a fixed width by widening the bins.
    /// </summary>
    public static List<double> Edges(
        List<double> values, double min, double max, HistogramBinMode mode, int binCount, double binWidth, bool fixedStart)
    {
        var byWidth = mode == HistogramBinMode.Width && binWidth > 0;
        if (max <= min && !byWidth)
        {
            return new List<double> { min, min + 1 };
        }

        if (byWidth)
        {
            return WidthEdges(min, max, binWidth, fixedStart);
        }

        var count = mode == HistogramBinMode.Count ? binCount : AutoBinCount(values, max - min);
        return CountEdges(min, max, Math.Clamp(count, 1, MaxBins));
    }

    /// <summary>The first bin at or below the lowest edge, the last at or above the highest, else by division.</summary>
    public static int Index(double value, List<double> edges, int binCount)
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

    public static List<HistogramBinDto> Bins(List<double> edges)
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

    /// <summary>A value exactly on the last edge belongs in the last bin, so no extra bin is added for it.</summary>
    private static List<double> WidthEdges(double min, double max, double binWidth, bool fixedStart)
    {
        var width = binWidth;
        var start = fixedStart ? min : Math.Floor(min / width) * width;
        var count = Math.Max(1, (int)Math.Ceiling((max - start) / width));
        if (count > MaxBins)
        {
            count = MaxBins;
            width = (max - start) / count;
        }
        var edges = new List<double>(count + 1);
        for (var i = 0; i <= count; i++)
        {
            edges.Add(start + i * width);
        }
        return edges;
    }

    private static List<double> CountEdges(double min, double max, int count)
    {
        var step = (max - min) / count;
        var edges = new List<double>(count + 1);
        for (var i = 0; i <= count; i++)
        {
            edges.Add(min + i * step);
        }
        // Pinned so rounding can't leave the last edge short of max.
        edges[^1] = max;
        return edges;
    }

    /// <summary>Freedman–Diaconis, falling back to Sturges when the IQR is zero.</summary>
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
        return Math.Max(1, (int)Math.Ceiling(Math.Log2(Math.Max(1, sampleSize)) + 1));
    }

    private static string FormatEdge(double value)
    {
        return value.ToString("0.###", CultureInfo.InvariantCulture);
    }
}
