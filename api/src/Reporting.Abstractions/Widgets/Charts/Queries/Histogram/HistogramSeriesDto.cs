namespace Reporting.Abstractions;

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
