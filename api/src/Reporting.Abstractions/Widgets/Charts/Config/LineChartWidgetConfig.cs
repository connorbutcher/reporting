namespace Reporting.Abstractions;

/// <summary>A line chart, with its own line-specific presentation options.</summary>
public class LineChartWidgetConfig : ChartWidgetConfig
{
    /// <summary>Draws the line with curved rather than straight segments.</summary>
    public bool Smooth { get; set; }
    /// <summary>Whether point markers are drawn along the line.</summary>
    public bool ShowPoints { get; set; } = true;
    /// <summary>Shades the area under the line.</summary>
    public bool AreaFill { get; set; }

    /// <summary>Reduces every row sharing an X value to one point; null plots the raw rows.</summary>
    public Aggregate? Aggregate { get; set; }

    /// <summary>Buckets a date X axis by period before aggregating; ignored without <see cref="Aggregate"/>.</summary>
    public DateGrouping? XGrouping { get; set; }
}
