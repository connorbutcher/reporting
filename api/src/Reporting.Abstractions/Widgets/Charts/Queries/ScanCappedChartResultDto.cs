namespace Reporting.Abstractions;

/// <summary>Counts for a chart that reads rows through a capped in-memory scan.</summary>
public abstract class ScanCappedChartResultDto : ChartResultCountsDto
{
    /// <summary>More rows had a value than the scan cap.</summary>
    public bool Truncated { get; set; }

    public int ScannedRowCount { get; set; }
}
