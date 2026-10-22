using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Every point's limits and verdicts. Centre lines come from the baseline points when set and are held across
/// the chart; each point's limits use the constants for its own size, so unequal subgroups step.
/// </summary>
internal sealed record ControlChartLimits(List<XBarRSubgroupDto> Subgroups, List<double> Centers, double XBarBar, double DispersionBar)
{
    public static ControlChartLimits Build(List<ControlChartPointStat> stats, List<ControlChartPointStat> basis, ControlChartMode mode)
    {
        return ControlChartStats.IsAttribute(mode) ? ForAttribute(stats, basis, mode) : ForVariable(stats, basis, mode);
    }

    /// <summary>Flags each point's broken Nelson rules on both charts: rule 1 always, the run rules when asked.</summary>
    public void ApplyRules(bool runRules)
    {
        // Judged against each point's own centre (an np chart's is its own n·p̄), not its limits' midpoint.
        var meanRules = ControlChartRules.Evaluate(
            Subgroups.Select((s, i) => new ControlChartPoint(s.Mean, Centers[i], s.XBarUcl, s.XBarLcl)).ToList(),
            runRules);
        var rangeRules = ControlChartRules.Evaluate(
            Subgroups.Select(s => new ControlChartPoint(s.HasRange ? s.Range : null, DispersionBar, s.RUcl, s.RLcl)).ToList(),
            runRules);
        for (var i = 0; i < Subgroups.Count; i++)
        {
            Subgroups[i].MeanRules = meanRules[i];
            Subgroups[i].RangeRules = rangeRules[i];
            Subgroups[i].MeanOutOfControl = meanRules[i].Count > 0;
            Subgroups[i].RangeOutOfControl = rangeRules[i].Count > 0;
        }
    }

    /// <summary>p̄ is total defectives over total units, so small subgroups aren't over-weighted.</summary>
    private static ControlChartLimits ForAttribute(List<ControlChartPointStat> stats, List<ControlChartPointStat> basis, ControlChartMode mode)
    {
        var units = basis.Sum(stat => stat.Count);
        var pBar = units > 0 ? basis.Sum(stat => stat.Dispersion) / units : 0d;
        var subgroups = stats.Select(stat => AttributeSubgroup(stat, pBar, mode)).ToList();
        var centers = stats.Select(stat => mode == ControlChartMode.Np ? stat.Count * pBar : pBar).ToList();
        var xBarBar = mode == ControlChartMode.Np ? basis.Average(stat => stat.Count) * pBar : pBar;
        return new ControlChartLimits(subgroups, centers, xBarBar, 0);
    }

    /// <summary>A point with no spread of its own (a lone value, the first individual) would bias the average low.</summary>
    private static ControlChartLimits ForVariable(List<ControlChartPointStat> stats, List<ControlChartPointStat> basis, ControlChartMode mode)
    {
        var xBarBar = basis.Average(stat => stat.Mean);
        var spread = basis.Where(stat => stat.HasDispersion).ToList();
        var dispersionBar = spread.Count > 0 ? spread.Average(stat => stat.Dispersion) : 0d;
        var subgroups = stats.Select(stat => VariableSubgroup(stat, xBarBar, dispersionBar, mode)).ToList();
        var centers = stats.Select(_ => xBarBar).ToList();
        return new ControlChartLimits(subgroups, centers, xBarBar, dispersionBar);
    }

    /// <summary>
    /// Binomial limits for the subgroup's own n: p̄ ± 3√(p̄(1−p̄)/n), or np̄ ± 3√(np̄(1−p̄)), floored at zero and
    /// a p chart's capped at one.
    /// </summary>
    private static XBarRSubgroupDto AttributeSubgroup(ControlChartPointStat stat, double pBar, ControlChartMode mode)
    {
        var n = stat.Count;
        var np = mode == ControlChartMode.Np;
        var center = np ? n * pBar : pBar;
        var spread = np ? 3 * Math.Sqrt(n * pBar * (1 - pBar)) : 3 * Math.Sqrt(pBar * (1 - pBar) / n);
        var upperCap = np ? n : 1;
        var ucl = Math.Min(center + spread, upperCap);
        var lcl = Math.Max(center - spread, 0);
        return new XBarRSubgroupDto
        {
            Mean = stat.Mean,
            Range = 0,
            Count = n,
            HasRange = false,
            XBarUcl = ucl,
            XBarLcl = lcl,
            RUcl = 0,
            RLcl = 0,
            MeanOutOfControl = stat.Mean > ucl || stat.Mean < lcl,
            RangeOutOfControl = false
        };
    }

    private static XBarRSubgroupDto VariableSubgroup(ControlChartPointStat stat, double xBarBar, double dispersionBar, ControlChartMode mode)
    {
        var (xSpread, dLcl, dUcl) = Spreads(stat.Count, dispersionBar, mode);
        var xUcl = xBarBar + xSpread;
        var xLcl = xBarBar - xSpread;
        return new XBarRSubgroupDto
        {
            Mean = stat.Mean,
            Range = stat.Dispersion,
            Count = stat.Count,
            HasRange = stat.HasDispersion,
            XBarUcl = xUcl,
            XBarLcl = xLcl,
            RUcl = dUcl,
            RLcl = dLcl,
            MeanOutOfControl = stat.Mean > xUcl || stat.Mean < xLcl,
            RangeOutOfControl = stat.HasDispersion && (stat.Dispersion > dUcl || stat.Dispersion < dLcl)
        };
    }

    /// <summary>The mean chart's half-width and the dispersion chart's limits, from the chart's constants.</summary>
    private static (double XSpread, double DLcl, double DUcl) Spreads(int count, double dispersionBar, ControlChartMode mode)
    {
        switch (mode)
        {
            case ControlChartMode.Individuals:
                return (ControlChartConstants.IndividualsE2 * dispersionBar, 0, ControlChartConstants.MovingRangeD4 * dispersionBar);
            case ControlChartMode.XBarS:
                var (a3, b3, b4) = ControlChartConstants.LookupS(count);
                return (a3 * dispersionBar, b3 * dispersionBar, b4 * dispersionBar);
            default:
                var (a2, d3, d4) = ControlChartConstants.Lookup(count);
                return (a2 * dispersionBar, d3 * dispersionBar, d4 * dispersionBar);
        }
    }
}
