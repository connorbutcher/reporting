namespace Reporting.Abstractions;

public class HistogramQueryDto
{
    public FilterGroupDto? Filter { get; set; }

    /// <summary>The numeric column whose values are binned into the distribution.</summary>
    public Guid ValueColumnId { get; set; }

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
}

/// <summary>One bin of a histogram: its half-open value range and a ready-made axis label.</summary>
public class HistogramBinDto
{
    /// <summary>The bin's inclusive lower edge.</summary>
    public double Lower { get; set; }

    /// <summary>The bin's exclusive upper edge (inclusive for the final bin).</summary>
    public double Upper { get; set; }

    /// <summary>A display label for the bin's range, e.g. "10 – 20".</summary>
    public string Label { get; set; } = string.Empty;
}

public class HistogramSeriesDto
{
    /// <summary>Resolved series key, "(blank)" already applied. Empty when there's no series column.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>One value per bin in <see cref="HistogramQueryResultDto.Bins"/> order — a count, frequency, or density per <see cref="HistogramQueryDto.Normalize"/>.</summary>
    public List<double> Values { get; set; } = new();
}

public class HistogramQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The bins, in ascending order — the shared category axis every series aligns to.</summary>
    public List<HistogramBinDto> Bins { get; set; } = new();
    public List<HistogramSeriesDto> Series { get; set; } = new();

    /// <summary>Reference lines for the value (X) axis, resolved the same way as the other charts' bands.</summary>
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
