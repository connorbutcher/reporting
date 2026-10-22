namespace Reporting.Abstractions;

public class XBarRChartQueryResultDto : ScanCappedChartResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>In display order.</summary>
    public List<string> Categories { get; set; } = new();

    /// <summary>Aligned with <see cref="Categories"/>.</summary>
    public List<XBarRSubgroupDto> Subgroups { get; set; } = new();

    /// <summary>The grand average of the subgroup means.</summary>
    public double XBarCenterLine { get; set; }

    /// <summary>Average range; average σ for Xbar-S, average moving range for Individuals.</summary>
    public double RCenterLine { get; set; }

    public ControlChartMode Mode { get; set; } = ControlChartMode.XBarR;

    /// <summary>Null when every point was used.</summary>
    public int? BaselineCount { get; set; }

    /// <summary>Aligned with <see cref="Categories"/>.</summary>
    public List<ChartCategoryDto> CategoryDetails { get; set; } = new();

    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
