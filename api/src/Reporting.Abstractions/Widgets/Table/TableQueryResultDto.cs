namespace Reporting.Abstractions;

public class TableQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<TableRowResultDto> Rows { get; set; } = new();

    /// <summary>Rows in the dataset before filtering, so the widget can show "142 of 1,203".</summary>
    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }

    /// <summary>Each column's configured total over every matched row, keyed by column id; only columns with a total appear.</summary>
    public Dictionary<Guid, TableCellDto> Totals { get; set; } = new();

    /// <summary>Min/max per column showing data bars, over every matched row, keyed by column id.</summary>
    public Dictionary<Guid, TableColumnStatsDto> ColumnStats { get; set; } = new();
}
