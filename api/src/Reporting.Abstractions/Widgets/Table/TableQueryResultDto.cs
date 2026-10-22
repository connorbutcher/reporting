namespace Reporting.Abstractions;

public class TableQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<TableRowResultDto> Rows { get; set; } = new();

    /// <summary>Before filtering.</summary>
    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }

    /// <summary>Over every matched row; only columns with a total appear.</summary>
    public Dictionary<Guid, TableCellDto> Totals { get; set; } = new();

    /// <summary>Only columns showing data bars.</summary>
    public Dictionary<Guid, TableColumnStatsDto> ColumnStats { get; set; } = new();
}
