namespace Reporting.Abstractions;

/// <summary>
/// A box-and-whisker chart. Like a bar chart it groups rows by its binding's category column
/// (<see cref="ChartSeriesBinding.XColumnId"/>), but instead of one aggregate it summarises each
/// group's values in the measure column (<see cref="ChartSeriesBinding.YColumnId"/>) into a
/// five-number summary (min, Q1, median, Q3, max) drawn as a box. A series column, if set, splits
/// each category into several boxes side by side.
/// </summary>
public class BoxPlotWidgetConfig : ChartWidgetConfig
{
    /// <summary>Where the whiskers end, and whether outliers are drawn beyond them.</summary>
    public BoxWhisker Whisker { get; set; } = BoxWhisker.Tukey;

    /// <summary>The whisker length multiplier — of the IQR for Tukey, of the standard deviation for StdDev. Ignored for MinMax.</summary>
    public double WhiskerFactor { get; set; } = 1.5;

    /// <summary>How the boxes are ordered along the category axis.</summary>
    public ChartSort Sort { get; set; } = new();

    /// <summary>Draws the mean as a marker inside each box, alongside the median line.</summary>
    public bool ShowMean { get; set; }

    /// <summary>Prints each box's sample size (n) above it.</summary>
    public bool ShowSampleSize { get; set; }

    /// <summary>Overlays the individual measurements as jittered points over each box.</summary>
    public bool ShowPoints { get; set; }

    /// <summary>Adds process performance (Pp/Ppk) to each box's tooltip, resolved against the value-axis spec band.</summary>
    public bool ShowCapability { get; set; }

    /// <summary>Draws boxes horizontally (categories down the Y axis) rather than upright.</summary>
    public bool Horizontal { get; set; }

    /// <summary>Buckets a date category by period; null groups by the exact date.</summary>
    public DateGrouping? CategoryGrouping { get; set; }
}
