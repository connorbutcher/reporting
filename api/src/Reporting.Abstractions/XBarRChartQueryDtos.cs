namespace Reporting.Abstractions;

public class XBarRChartQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>The column whose distinct values become the subgroups (any type).</summary>
    public Guid CategoryColumnId { get; set; }

    /// <summary>The numeric column whose per-subgroup mean and range are plotted.</summary>
    public Guid ValueColumnId { get; set; }

    /// <summary>How the subgroups are ordered along the shared axis.</summary>
    public ChartSort Sort { get; set; } = new();

    /// <summary>Optional spec limits overlaid on the X-bar chart, resolved the same way as the other charts.</summary>
    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();

    /// <summary>Buckets a date subgroup column by period; null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    /// <summary>Which pair of control charts to compute.</summary>
    public ControlChartMode Mode { get; set; } = ControlChartMode.XBarR;

    /// <summary>Computes the limits from only the first N points and holds them; null (or 0) uses every point.</summary>
    public int? BaselineSubgroups { get; set; }

    /// <summary>Also evaluates the Nelson run rules 2–5, not just points beyond the limits (rule 1).</summary>
    public bool RunRules { get; set; }
}

/// <summary>
/// One subgroup's mean and range, plus the control limits it's judged against — carried per
/// subgroup (rather than once for the whole chart) because they vary with that subgroup's own
/// sample size when subgroup sizes aren't all equal.
/// </summary>
public class XBarRSubgroupDto
{
    public double Mean { get; set; }
    public double Range { get; set; }

    /// <summary>How many rows fed this subgroup.</summary>
    public int Count { get; set; }

    /// <summary>Whether <see cref="Range"/> means anything: false for a subgroup of one, or the first individual (no moving range yet).</summary>
    public bool HasRange { get; set; }

    public double XBarUcl { get; set; }
    public double XBarLcl { get; set; }
    public double RUcl { get; set; }
    public double RLcl { get; set; }

    /// <summary>Whether this subgroup's mean falls outside its own X-bar control limits.</summary>
    public bool MeanOutOfControl { get; set; }

    /// <summary>Whether this subgroup's range falls outside its own R control limits.</summary>
    public bool RangeOutOfControl { get; set; }

    /// <summary>The Nelson rules (1–5) this point breaks on the X-bar chart; rule 1 is "beyond the limits".</summary>
    public List<int> MeanRules { get; set; } = new();

    /// <summary>The Nelson rules this point breaks on the range (or σ / moving range) chart.</summary>
    public List<int> RangeRules { get; set; } = new();
}

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
