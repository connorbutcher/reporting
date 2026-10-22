namespace Reporting.Abstractions;

public class BoxPlotSeriesDto
{
    /// <summary>The split value, "(blank)" applied. Empty without a series column.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Aligned with the categories; null where the series has no rows.</summary>
    public List<BoxDto?> Boxes { get; set; } = new();

    /// <summary>Empty for min/max whiskers.</summary>
    public List<BoxOutlierDto> Outliers { get; set; } = new();

    /// <summary>Selects this series' rows for drill-through; null with no split.</summary>
    public FilterGroupDto? Drill { get; set; }
}
