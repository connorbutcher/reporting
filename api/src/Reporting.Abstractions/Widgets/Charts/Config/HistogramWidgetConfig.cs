namespace Reporting.Abstractions;

/// <summary>The distribution of one numeric column (<see cref="ChartSeriesBinding.XColumnId"/>), binned.</summary>
public class HistogramWidgetConfig : ChartWidgetConfig
{
    public HistogramBinMode BinMode { get; set; } = HistogramBinMode.Auto;

    /// <summary>Used by <see cref="HistogramBinMode.Count"/> only.</summary>
    public int BinCount { get; set; } = 10;

    /// <summary>Used by <see cref="HistogramBinMode.Width"/> only.</summary>
    public double BinWidth { get; set; } = 1;

    /// <summary>Null uses the data's minimum.</summary>
    public double? RangeMin { get; set; }

    /// <summary>Null uses the data's maximum.</summary>
    public double? RangeMax { get; set; }

    public HistogramNormalize Normalize { get; set; } = HistogramNormalize.Count;

    public bool Cumulative { get; set; }

    public bool Horizontal { get; set; }

    /// <summary>Non-cumulative only.</summary>
    public bool? ShowNormalCurve { get; set; }
}
