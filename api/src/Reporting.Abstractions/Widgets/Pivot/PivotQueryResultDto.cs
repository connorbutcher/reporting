namespace Reporting.Abstractions;

public class PivotQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public List<PivotFieldDto> RowFields { get; set; } = new();

    public List<PivotFieldDto> ColumnFields { get; set; } = new();

    public List<PivotMeasureColumnDto> Measures { get; set; } = new();

    /// <summary>Empty without column fields.</summary>
    public List<PivotColumnKeyDto> ColumnKeys { get; set; } = new();

    /// <summary>Each row ends with a block of row totals.</summary>
    public bool HasRowTotals { get; set; }

    public List<PivotRowDto> Rows { get; set; } = new();

    public PivotRowDto? GrandTotal { get; set; }

    /// <summary>Before filtering.</summary>
    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }

    /// <summary>Only <see cref="ScannedRowCount"/> rows were summarised, so every value is incomplete.</summary>
    public bool ScanTruncated { get; set; }

    public int ScannedRowCount { get; set; }

    /// <summary>Some groups aren't listed; the totals still count them.</summary>
    public bool RowsTruncated { get; set; }

    public bool ColumnsTruncated { get; set; }

    public bool Truncated { get; set; }
}
