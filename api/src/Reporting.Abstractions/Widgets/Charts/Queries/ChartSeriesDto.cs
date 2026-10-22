namespace Reporting.Abstractions;

public class ChartSeriesDto
{
    /// <summary>The split value, "(blank)" applied. Empty without a series column.</summary>
    public string Label { get; set; } = string.Empty;
    public List<ChartPointDto> Points { get; set; } = new();

    /// <summary>Null unless requested, both axes are numeric/date and there are two distinct X values.</summary>
    public TrendLineDto? TrendLine { get; set; }
}
