namespace Reporting.Abstractions;

/// <summary>
/// Groups rows by the category column and reduces each group's measure to one bar by <see cref="Aggregate"/>.
/// The measure may be unbound when the aggregate is <see cref="Aggregate.Count"/>.
/// </summary>
public class BarChartWidgetConfig : ChartWidgetConfig
{
    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    public bool Stacked { get; set; }

    public bool Horizontal { get; set; }

    public ChartSort Sort { get; set; } = new();

    /// <summary>Null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    /// <summary>100% stacked; implies stacked.</summary>
    public bool? PercentStacked { get; set; }

    public bool? ShowStackTotals { get; set; }
}
