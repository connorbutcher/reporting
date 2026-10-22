namespace Reporting.Abstractions;

public class TableQueryDto
{
    public FilterGroupDto? Filter { get; set; }
    public Guid? SortColumnId { get; set; }
    public SortDirection SortDirection { get; set; } = SortDirection.Asc;
    public int Skip { get; set; }
    public int Take { get; set; } = 50;

    /// <summary>The widget's own column settings, so tolerance/format resolve exactly as configured.</summary>
    public List<DataTableColumnSetting> Columns { get; set; } = new();

    /// <summary>Keeps only rows where some requested column's text contains this, ignoring case. Blank searches nothing.</summary>
    public string? Search { get; set; }

    /// <summary>Narrows the query to this one row, for a row-detail view. Null queries every row.</summary>
    public Guid? RowId { get; set; }
}
