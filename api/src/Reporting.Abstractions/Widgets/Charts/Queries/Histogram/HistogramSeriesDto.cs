namespace Reporting.Abstractions;

public class HistogramSeriesDto
{
    /// <summary>The split value, "(blank)" applied. Empty without a series column.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>The raw split key; server-side only.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public string Key { get; set; } = string.Empty;

    public Guid? ValueColumnId { get; set; }

    public string ValueColumnLabel { get; set; } = string.Empty;

    /// <summary>Aligned with the bins, per <see cref="HistogramQueryDto.Normalize"/>.</summary>
    public List<double> Values { get; set; } = new();

    // For a fitted normal curve; counts only values in range.
    public double Mean { get; set; }
    public double StdDev { get; set; }
    public int Count { get; set; }

    /// <summary>Selects this series' rows for drill-through; null with no split.</summary>
    public FilterGroupDto? Drill { get; set; }

    /// <summary>Averages over each bin's rows, aligned with <see cref="Values"/>.</summary>
    public List<List<string>> TooltipLines { get; set; } = new();
}
