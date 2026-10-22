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
