namespace Reporting.Abstractions;

/// <summary>
/// A combination chart: the bar chart's category + aggregate data model, but each series (binding)
/// draws either as bars or as a line over the shared categories, per <see cref="ChartSeriesBinding.RenderAs"/>.
/// Series can sit on separate value axes (dual axis). Reuses the bar query end to end; only the client
/// rendering differs.
/// </summary>
public class ComboChartWidgetConfig : ChartWidgetConfig
{
    /// <summary>How each category's rows are reduced to one value per series — shared by bars and lines.</summary>
    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    /// <summary>Stacks each binding's bar series into one column; line series are never stacked.</summary>
    public bool Stacked { get; set; }

    /// <summary>Draws line series with curved rather than straight segments.</summary>
    public bool Smooth { get; set; }

    /// <summary>Whether point markers are drawn along line series.</summary>
    public bool ShowPoints { get; set; } = true;

    /// <summary>Shades the area under line series.</summary>
    public bool AreaFill { get; set; }

    /// <summary>How the bars/lines are ordered along the category axis.</summary>
    public ChartSort Sort { get; set; } = new();

    /// <summary>Buckets a date category by period; null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    /// <summary>Draws line series straight across categories a series has no value for, instead of breaking.</summary>
    public bool? ConnectNulls { get; set; }
}
