namespace Reporting.Abstractions;

/// <summary>Where a value falls relative to a resolved tolerance band, already classified server-side.</summary>
public enum ToleranceStatus
{
    None,
    Pass,
    Concession,
    Fail
}

public class TableQueryDto
{
    public FilterGroupDto? Filter { get; set; }
    public Guid? SortColumnId { get; set; }
    public SortDirection SortDirection { get; set; } = SortDirection.Asc;
    public int Skip { get; set; }
    public int Take { get; set; } = 50;

    /// <summary>The widget's own column settings, so tolerance/format resolve exactly as configured.</summary>
    public List<DataTableColumnSetting> Columns { get; set; } = new();
}

public class TableCellDto
{
    /// <summary>Already formatted per the column's stored display configuration. Null for a blank cell.</summary>
    public string? DisplayValue { get; set; }
    public ToleranceStatus Tolerance { get; set; } = ToleranceStatus.None;
}

public class TableRowResultDto
{
    public Guid Id { get; set; }

    /// <summary>Keyed by column id, one entry per column in the request's Columns list.</summary>
    public Dictionary<Guid, TableCellDto> Cells { get; set; } = new();
}

public class TableQueryResultDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<TableRowResultDto> Rows { get; set; } = new();

    /// <summary>Rows in the dataset before filtering, so the widget can show "142 of 1,203".</summary>
    public int TotalRowCount { get; set; }
    public int MatchedRowCount { get; set; }
}
