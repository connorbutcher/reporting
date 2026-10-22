using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

internal static class ControlChartStats
{
    public static bool IsAttribute(ControlChartMode mode)
    {
        return mode is ControlChartMode.P or ControlChartMode.Np;
    }

    /// <summary>Individuals plot every value in subgroup then row order; the other charts one point per subgroup.</summary>
    public static List<ControlChartPointStat> For(ControlChartMode mode, List<string> orderedKeys, Dictionary<string, List<double>> valuesByCategory)
    {
        if (mode == ControlChartMode.Individuals)
        {
            return Individuals(orderedKeys.SelectMany(key => valuesByCategory[key]).ToList());
        }
        if (IsAttribute(mode))
        {
            return orderedKeys.Select(key => Attribute(valuesByCategory[key], mode)).ToList();
        }
        return orderedKeys.Select(key => Subgroup(valuesByCategory[key], mode)).ToList();
    }

    /// <summary>The mean and the range (max − min), or for Xbar-S the sample σ.</summary>
    private static ControlChartPointStat Subgroup(List<double> values, ControlChartMode mode)
    {
        var mean = values.Average();
        var dispersion = mode == ControlChartMode.XBarS ? Statistics.StdDev(values, mean) : values.Max() - values.Min();
        return new ControlChartPointStat(mean, dispersion, values.Count, values.Count >= 2);
    }

    /// <summary>
    /// Any non-zero value is a defective unit, plotted as a proportion (p) or count (np). The defective count
    /// rides in the otherwise unused dispersion slot, so p̄ can be pooled from counts.
    /// </summary>
    private static ControlChartPointStat Attribute(List<double> values, ControlChartMode mode)
    {
        var defective = values.Count(value => value != 0);
        var plotted = mode == ControlChartMode.Np ? defective : (double)defective / values.Count;
        return new ControlChartPointStat(plotted, defective, values.Count, false);
    }

    /// <summary>Each value with its moving range |xᵢ − xᵢ₋₁|; the first has none.</summary>
    private static List<ControlChartPointStat> Individuals(List<double> values)
    {
        return values.Select((value, i) => new ControlChartPointStat(value, i == 0 ? 0 : Math.Abs(value - values[i - 1]), 1, i > 0)).ToList();
    }
}
