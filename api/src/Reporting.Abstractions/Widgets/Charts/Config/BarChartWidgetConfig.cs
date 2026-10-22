namespace Reporting.Abstractions;

/// <summary>
/// A bar chart: unlike scatter/line it doesn't plot raw rows. Rows are grouped by
/// the category column (<see cref="ChartWidgetConfig.XColumnId"/>) and each group's
/// values in the measure column (<see cref="ChartWidgetConfig.YColumnId"/>) are
/// reduced to one bar by <see cref="Aggregate"/>. The measure is unused — and may be
/// left unbound — when the aggregate is <see cref="Aggregate.Count"/>, which counts
/// rows. A series column, if set, splits each category into grouped (or stacked) bars.
/// </summary>
public class BarChartWidgetConfig : ChartWidgetConfig
{
    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    /// <summary>Stacks a category's series bars into one column instead of placing them side by side.</summary>
    public bool Stacked { get; set; }

    /// <summary>Draws bars horizontally (categories down the Y axis) rather than as vertical columns.</summary>
    public bool Horizontal { get; set; }

    /// <summary>How the bars are ordered along the category axis.</summary>
    public ChartSort Sort { get; set; } = new();

    /// <summary>Buckets a date category by period; null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    /// <summary>Stacks bars as each series' share of its category's total (100% stacked). Implies stacked.</summary>
    public bool? PercentStacked { get; set; }

    /// <summary>Prints each stack's total above it.</summary>
    public bool? ShowStackTotals { get; set; }
}
