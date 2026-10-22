namespace Reporting.Abstractions;

/// <summary>A bar chart whose series can each draw as bars or a line (<see cref="ChartSeriesBinding.RenderAs"/>).</summary>
public class ComboChartWidgetConfig : ChartWidgetConfig
{
    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    /// <summary>Stacks bar series only; lines are never stacked.</summary>
    public bool Stacked { get; set; }

    public bool Smooth { get; set; }

    public bool ShowPoints { get; set; } = true;

    public bool AreaFill { get; set; }

    public ChartSort Sort { get; set; } = new();

    /// <summary>Null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }

    public bool? ConnectNulls { get; set; }
}
