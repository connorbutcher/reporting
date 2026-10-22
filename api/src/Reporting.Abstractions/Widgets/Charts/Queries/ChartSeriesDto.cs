namespace Reporting.Abstractions;

public class ChartSeriesDto
{
    /// <summary>Resolved series key, "(blank)" already applied. Empty when there's no series column.</summary>
    public string Label { get; set; } = string.Empty;
    public List<ChartPointDto> Points { get; set; } = new();

    /// <summary>
    /// This series' least-squares fit, when requested and both axes are numeric/date. Null when
    /// not requested, when either axis is text, or when the series has fewer than two distinct
    /// X values to fit a line through.
    /// </summary>
    public TrendLineDto? TrendLine { get; set; }
}
