namespace Reporting.Abstractions;

/// <summary>
/// A histogram: unlike the other charts it plots the distribution of a single numeric
/// column (<see cref="ChartSeriesBinding.XColumnId"/>). Its values are binned into equal
/// ranges and each bin's frequency drawn as a bar. A series column, if set, overlays a
/// separate distribution per distinct value. Bin edges follow <see cref="BinMode"/>, and
/// each bar's height follows <see cref="Normalize"/>.
/// </summary>
public class HistogramWidgetConfig : ChartWidgetConfig
{
    /// <summary>How the bin edges are chosen — a fixed count, a fixed width, or an automatic rule.</summary>
    public HistogramBinMode BinMode { get; set; } = HistogramBinMode.Auto;

    /// <summary>The number of bins for <see cref="HistogramBinMode.Count"/>; ignored otherwise.</summary>
    public int BinCount { get; set; } = 10;

    /// <summary>The width of each bin for <see cref="HistogramBinMode.Width"/>; ignored otherwise.</summary>
    public double BinWidth { get; set; } = 1;

    /// <summary>Fixed lower bound of the binned range; null uses the data's minimum.</summary>
    public double? RangeMin { get; set; }

    /// <summary>Fixed upper bound of the binned range; null uses the data's maximum.</summary>
    public double? RangeMax { get; set; }

    /// <summary>Whether each bar shows a raw count, a relative frequency, or a density.</summary>
    public HistogramNormalize Normalize { get; set; } = HistogramNormalize.Count;

    /// <summary>Accumulates each bin into the ones before it, drawing a cumulative distribution.</summary>
    public bool Cumulative { get; set; }

    /// <summary>Draws bars horizontally (bins down the Y axis) rather than as vertical columns.</summary>
    public bool Horizontal { get; set; }

    /// <summary>Overlays a fitted normal curve on each series (non-cumulative only).</summary>
    public bool? ShowNormalCurve { get; set; }
}
