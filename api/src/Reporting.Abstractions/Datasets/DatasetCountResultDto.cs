namespace Reporting.Abstractions;

/// <summary>
/// The counts alone — how many rows match a filter, out of the dataset's total —
/// without the rows themselves, for the filter panel's live "matches N of M" readout.
/// </summary>
public class DatasetCountResultDto
{
    /// <summary>Rows in the dataset before filtering.</summary>
    public int TotalRowCount { get; set; }

    /// <summary>Rows matching the filter.</summary>
    public int MatchedRowCount { get; set; }
}
