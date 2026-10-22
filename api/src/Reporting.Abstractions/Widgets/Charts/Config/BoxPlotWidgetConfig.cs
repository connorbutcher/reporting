namespace Reporting.Abstractions;

/// <summary>Groups rows by the category column and summarises each group's measure as a box (min, Q1, median, Q3, max).</summary>
public class BoxPlotWidgetConfig : ChartWidgetConfig
{
    public BoxWhisker Whisker { get; set; } = BoxWhisker.Tukey;

    /// <summary>Multiplier of the IQR for Tukey, of the standard deviation for StdDev. Ignored for MinMax.</summary>
    public double WhiskerFactor { get; set; } = 1.5;

    public ChartSort Sort { get; set; } = new();

    public bool ShowMean { get; set; }

    public bool ShowSampleSize { get; set; }

    /// <summary>Overlays the individual measurements as jittered points.</summary>
    public bool ShowPoints { get; set; }

    /// <summary>Adds Pp/Ppk to each box's tooltip, resolved against the value-axis spec band.</summary>
    public bool ShowCapability { get; set; }

    public bool Horizontal { get; set; }

    /// <summary>Null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }
}
