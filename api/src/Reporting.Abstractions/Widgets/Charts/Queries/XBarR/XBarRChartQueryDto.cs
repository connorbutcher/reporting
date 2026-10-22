namespace Reporting.Abstractions;

public class XBarRChartQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>Any type.</summary>
    public Guid CategoryColumnId { get; set; }

    public Guid ValueColumnId { get; set; }

    public ChartSort Sort { get; set; } = new();

    /// <summary>Spec limits overlaid on the X-bar chart.</summary>
    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();

    /// <summary>Null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    public ControlChartMode Mode { get; set; } = ControlChartMode.XBarR;

    /// <summary>Limits from only the first N points; null or 0 uses every point.</summary>
    public int? BaselineSubgroups { get; set; }

    /// <summary>Also evaluates Nelson rules 2–5.</summary>
    public bool RunRules { get; set; }
}
