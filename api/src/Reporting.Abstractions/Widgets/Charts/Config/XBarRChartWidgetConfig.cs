namespace Reporting.Abstractions;

/// <summary>
/// An Xbar-R control chart: a Shewhart pair monitoring a process over time. Like a box plot it
/// groups rows by its binding's category column (<see cref="ChartSeriesBinding.XColumnId"/>) —
/// here the subgroup/sample each row belongs to — but instead of a five-number summary it reduces
/// each subgroup's values in the measure column (<see cref="ChartSeriesBinding.YColumnId"/>) to a
/// mean and a range, plotted on two stacked charts against control limits derived from the data
/// itself (not a spec): the subgroup means' own grand average and the average range, scaled by the
/// standard Shewhart constants for that subgroup's size. No series split — a control chart watches
/// one process stream.
/// </summary>
public class XBarRChartWidgetConfig : ChartWidgetConfig
{
    /// <summary>How the subgroups are ordered along the shared axis — critical here, since a control
    /// chart reads left-to-right as a time/sequence order, not an arbitrary category ranking.</summary>
    public ChartSort Sort { get; set; } = new();

    /// <summary>Colours a subgroup's mean or range red when it falls outside its control limits.</summary>
    public bool HighlightOutOfControl { get; set; } = true;

    /// <summary>Buckets a date subgroup column by period; null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    /// <summary>Which pair of control charts to draw.</summary>
    public ControlChartMode Mode { get; set; } = ControlChartMode.XBarR;

    /// <summary>Computes the control limits from only the first N points (a baseline) and holds them; null uses every point.</summary>
    public int? BaselineSubgroups { get; set; }

    /// <summary>Also flags the Nelson run rules (2–5), not just points beyond the limits.</summary>
    public bool? RunRules { get; set; }
}
