namespace Reporting.Abstractions;

public class XBarRChartQueryResultDto : ScanCappedChartResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The subgroup labels, in display order — the shared axis both charts align to.</summary>
    public List<string> Categories { get; set; } = new();

    /// <summary>One entry per category, in the same order.</summary>
    public List<XBarRSubgroupDto> Subgroups { get; set; } = new();

    /// <summary>The grand average of the subgroup means — the X-bar chart's centre line.</summary>
    public double XBarCenterLine { get; set; }

    /// <summary>The average subgroup range — the R chart's centre line (average σ for Xbar-S, average moving range for Individuals).</summary>
    public double RCenterLine { get; set; }

    /// <summary>The chart pair these figures are for.</summary>
    public ControlChartMode Mode { get; set; } = ControlChartMode.XBarR;

    /// <summary>How many points the limits were computed from, when a baseline held them; null when every point was used.</summary>
    public int? BaselineCount { get; set; }

    /// <summary>One entry per category, in the same order: its natural sort key and drill-through conditions.</summary>
    public List<ChartCategoryDto> CategoryDetails { get; set; } = new();

    /// <summary>Reference lines for the X-bar axis, resolved the same way as the other charts' spec bands.</summary>
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
