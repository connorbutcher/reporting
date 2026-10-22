namespace Reporting.Abstractions;

/// <summary>
/// The counts of a chart that reads its rows through a capped in-memory scan (box plot, histogram),
/// so the widget can say when its figures cover only the first <see cref="ScannedRowCount"/> rows.
/// </summary>
public abstract class ScanCappedChartResultDto : ChartResultCountsDto
{
    /// <summary>True when more rows carried a value than the scan cap, so the chart summarises only a prefix of them.</summary>
    public bool Truncated { get; set; }

    /// <summary>How many rows the chart actually read — the scan cap when <see cref="Truncated"/>, else every row with a value.</summary>
    public int ScannedRowCount { get; set; }
}
