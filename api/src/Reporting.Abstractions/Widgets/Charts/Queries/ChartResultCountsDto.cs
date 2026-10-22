namespace Reporting.Abstractions;

/// <summary>
/// The row counts every chart result carries, so its widget can show the same "N of M rows" footer
/// the table does. Counted against the dataset's rows, before any per-chart narrowing (a point chart
/// dropping rows with no axis value, a bar chart skipping rows with no measure).
/// </summary>
public abstract class ChartResultCountsDto
{
    /// <summary>Every row in the dataset, ignoring the filter.</summary>
    public int TotalRowCount { get; set; }

    /// <summary>The rows the filter matches; equals <see cref="TotalRowCount"/> when there is no filter.</summary>
    public int MatchedRowCount { get; set; }
}
