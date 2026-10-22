namespace Reporting.Abstractions;

public class HistogramQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>Deprecated; folded into <see cref="ValueColumnIds"/> when that is empty.</summary>
    public Guid ValueColumnId { get; set; }

    /// <summary>One distribution each, sharing one set of bin edges.</summary>
    public List<Guid> ValueColumnIds { get; set; } = new();

    public Guid? SeriesColumnId { get; set; }

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

    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();

    /// <summary>Averaged over each bin's rows.</summary>
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();
}
