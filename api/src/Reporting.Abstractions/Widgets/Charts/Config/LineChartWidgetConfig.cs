namespace Reporting.Abstractions;

public class LineChartWidgetConfig : ChartWidgetConfig
{
    public bool Smooth { get; set; }
    public bool ShowPoints { get; set; } = true;
    public bool AreaFill { get; set; }

    /// <summary>Reduces rows sharing an X value to one point; null plots the raw rows.</summary>
    public Aggregate? Aggregate { get; set; }

    /// <summary>Ignored without <see cref="Aggregate"/>.</summary>
    public DateGrouping? XGrouping { get; set; }
}
