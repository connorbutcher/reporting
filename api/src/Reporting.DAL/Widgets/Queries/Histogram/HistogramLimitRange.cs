using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Widens a histogram's automatic range to its spec limits. Bins only span their range, so a limit outside the
/// data (the usual case for a capable process) would otherwise have nowhere to be drawn.
/// </summary>
internal static class HistogramLimitRange
{
    public static (double Min, double Max) Extend(double min, double max, IEnumerable<ResolvedToleranceBandDto> bands)
    {
        foreach (var limit in Limits(bands))
        {
            min = Math.Min(min, limit);
            max = Math.Max(max, limit);
        }
        return (min, max);
    }

    /// <summary>The finite limits of the bands on the binned (X) axis.</summary>
    private static IEnumerable<double> Limits(IEnumerable<ResolvedToleranceBandDto> bands)
    {
        return bands
            .Where(band => band.Axis == ChartAxis.X)
            .SelectMany(band => new[] { band.Min, band.Max, band.ConcessionLower, band.ConcessionUpper })
            .Where(limit => limit is { } value && double.IsFinite(value))
            .Select(limit => limit!.Value);
    }
}
