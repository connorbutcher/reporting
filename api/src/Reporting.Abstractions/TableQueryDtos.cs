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

    /// <summary>Keeps only rows where some requested column's text contains this, ignoring case. Blank searches nothing.</summary>
    public string? Search { get; set; }

    /// <summary>Narrows the query to this one row, for a row-detail view. Null queries every row.</summary>
    public Guid? RowId { get; set; }
}

/// <summary>The smallest and largest number in a column across every matched row, for scaling data bars.</summary>
public class TableColumnStatsDto
{
    public double? Min { get; set; }
    public double? Max { get; set; }
}

public class TableCellDto
{
    /// <summary>Already formatted per the column's stored display configuration. Null for a blank cell.</summary>
    public string? DisplayValue { get; set; }

    /// <summary>
    /// The cell's typed value: a number, a date, true/false, or text, per the column's type. Null for a
    /// blank cell. Lets the client export real numbers and evaluate conditional formatting.
    /// </summary>
    public object? Value { get; set; }

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

    /// <summary>Each column's configured total over every matched row, keyed by column id; only columns with a total appear.</summary>
    public Dictionary<Guid, TableCellDto> Totals { get; set; } = new();

    /// <summary>Min/max per column showing data bars, over every matched row, keyed by column id.</summary>
    public Dictionary<Guid, TableColumnStatsDto> ColumnStats { get; set; } = new();
}
