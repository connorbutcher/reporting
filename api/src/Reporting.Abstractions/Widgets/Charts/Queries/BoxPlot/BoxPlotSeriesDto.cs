namespace Reporting.Abstractions;

public class BoxPlotSeriesDto
{
    /// <summary>Resolved series key, "(blank)" already applied. Empty when there's no series column.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>One entry per category in <see cref="BoxPlotQueryResultDto.Categories"/> order; null where this series has no rows in that category.</summary>
    public List<BoxDto?> Boxes { get; set; } = new();

    /// <summary>Values past the whiskers (Tukey only), each carrying its category index. Empty for min/max whiskers.</summary>
    public List<BoxOutlierDto> Outliers { get; set; } = new();

    /// <summary>Conditions selecting this series' rows (its split value), for drill-through; null with no split.</summary>
    public FilterGroupDto? Drill { get; set; }
}
