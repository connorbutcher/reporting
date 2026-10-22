namespace Reporting.Abstractions;

public class TableQueryDto
{
    public FilterGroupDto? Filter { get; set; }
    public Guid? SortColumnId { get; set; }
    public SortDirection SortDirection { get; set; } = SortDirection.Asc;
    public int Skip { get; set; }
    public int Take { get; set; } = 50;

    public List<DataTableColumnSetting> Columns { get; set; } = new();

    /// <summary>Case-insensitive contains across the requested columns.</summary>
    public string? Search { get; set; }

    /// <summary>For a row-detail view.</summary>
    public Guid? RowId { get; set; }
}
