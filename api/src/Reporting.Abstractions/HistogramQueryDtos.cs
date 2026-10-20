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

    /// <summary>The raw split key behind <see cref="Label"/>; server-side only, not serialised.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public string Key { get; set; } = string.Empty;

    /// <summary>Which column this series distributes, when several value columns are plotted. Lets the client label a measure's series.</summary>
    public Guid? ValueColumnId { get; set; }

    /// <summary>The measure column's display name, so the client can label multi-measure series without its schema.</summary>
    public string ValueColumnLabel { get; set; } = string.Empty;

    /// <summary>One value per bin in <see cref="HistogramQueryResultDto.Bins"/> order — a count, frequency, or density per <see cref="HistogramQueryDto.Normalize"/>.</summary>
    public List<double> Values { get; set; } = new();

    /// <summary>The series' own mean, sample standard deviation and value count (in range), for a fitted normal curve.</summary>
    public double Mean { get; set; }
    public double StdDev { get; set; }
    public int Count { get; set; }

    /// <summary>Conditions selecting this series' rows (its split value), for drill-through; null with no split.</summary>
    public FilterGroupDto? Drill { get; set; }

    /// <summary>Each bin's tooltip column lines (averages over the bin's rows), aligned with <see cref="Values"/>.</summary>
    public List<List<string>> TooltipLines { get; set; } = new();
}

public class HistogramQueryResultDto : ScanCappedChartResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The bins, in ascending order — the shared category axis every series aligns to.</summary>
    public List<HistogramBinDto> Bins { get; set; } = new();
    public List<HistogramSeriesDto> Series { get; set; } = new();

    /// <summary>Values left out because they fell outside a fixed range.</summary>
    public int ExcludedCount { get; set; }

    /// <summary>Reference lines for the value (X) axis, resolved the same way as the other charts' bands.</summary>
    public List<ResolvedToleranceBandDto> ToleranceBands { get; set; } = new();
}
