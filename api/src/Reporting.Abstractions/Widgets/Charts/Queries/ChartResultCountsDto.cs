namespace Reporting.Abstractions;

/// <summary>Counted before any per-chart narrowing, such as rows with no axis value.</summary>
public abstract class ChartResultCountsDto
{
    /// <summary>Ignores the filter.</summary>
    public int TotalRowCount { get; set; }

    public int MatchedRowCount { get; set; }
}
