namespace Reporting.Abstractions;

/// <summary>
/// A Shewhart control chart pair. Rows are grouped into subgroups by the category column, and limits
/// come from the data itself, not a spec.
/// </summary>
public class XBarRChartWidgetConfig : ChartWidgetConfig
{
    /// <summary>The chart reads left to right as sequence, so this should follow time order.</summary>
    public ChartSort Sort { get; set; } = new();

    public bool HighlightOutOfControl { get; set; } = true;

    /// <summary>Null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    public ControlChartMode Mode { get; set; } = ControlChartMode.XBarR;

    /// <summary>Computes limits from only the first N points; null uses every point.</summary>
    public int? BaselineSubgroups { get; set; }

    /// <summary>Also flags Nelson rules 2–5.</summary>
    public bool? RunRules { get; set; }
}
