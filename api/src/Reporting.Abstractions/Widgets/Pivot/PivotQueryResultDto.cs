namespace Reporting.Abstractions;

public class PivotQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The dimension columns, left to right — the grouped columns' headers.</summary>
    public List<PivotFieldDto> RowFields { get; set; } = new();

    /// <summary>The fields spread across the top, in order.</summary>
    public List<PivotFieldDto> ColumnFields { get; set; } = new();

    /// <summary>The measure columns, in order — the value columns' headers.</summary>
    public List<PivotMeasureColumnDto> Measures { get; set; } = new();

    /// <summary>The column-field combinations across the top, in order; empty without column fields.</summary>
    public List<PivotColumnKeyDto> ColumnKeys { get; set; } = new();

    /// <summary>True when each row ends with a block of row totals after its column groups.</summary>
    public bool HasRowTotals { get; set; }

    public List<PivotRowDto> Rows { get; set; } = new();

    /// <summary>The totals row, when requested; null otherwise.</summary>
    public PivotRowDto? GrandTotal { get; set; }

    /// <summary>Rows in the dataset before filtering, so the widget can show "142 of 1,203".</summary>
    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }

    /// <summary>
    /// True when only the first <see cref="ScannedRowCount"/> matched rows were summarised, so every
    /// value — totals included — is incomplete.
    /// </summary>
    public bool ScanTruncated { get; set; }

    /// <summary>How many matched rows were summarised.</summary>
    public int ScannedRowCount { get; set; }

    /// <summary>True when there were more groups than the row cap, so some groups aren't listed (the totals still count them).</summary>
    public bool RowsTruncated { get; set; }

    /// <summary>True when there were more column-field combinations than the column cap, so some aren't shown.</summary>
    public bool ColumnsTruncated { get; set; }

    /// <summary>True when any cap was hit.</summary>
    public bool Truncated { get; set; }
}
