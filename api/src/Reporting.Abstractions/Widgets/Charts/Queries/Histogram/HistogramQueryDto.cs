namespace Reporting.Abstractions;

public class HistogramQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>
    /// Deprecated single column — kept so an older caller still resolves. Prefer
    /// <see cref="ValueColumnIds"/>; when that is empty this is folded into it.
    /// </summary>
    public Guid ValueColumnId { get; set; }

    /// <summary>
    /// The numeric columns whose values are binned, each plotted as its own distribution sharing
    /// one set of bin edges. When empty the deprecated <see cref="ValueColumnId"/> is folded in as
    /// the single measure.
    /// </summary>
    public List<Guid> ValueColumnIds { get; set; } = new();

    /// <summary>Splits the distribution into an overlaid series per distinct value. Null yields one series.</summary>
    public Guid? SeriesColumnId { get; set; }

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

    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();

    /// <summary>Extra numeric columns averaged over each bin's rows, for its tooltip.</summary>
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();
}
