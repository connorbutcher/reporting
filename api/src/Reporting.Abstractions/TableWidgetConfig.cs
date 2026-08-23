namespace Reporting.Abstractions;

public enum SortDirection
{
    Asc,
    Desc
}

public enum ColumnAlign
{
    Left,
    Center,
    Right
}

public enum TableDensity
{
    Compact,
    Normal,
    Comfortable
}

/// <summary>A column placed on the table, in display order.</summary>
public class DataTableColumnSetting
{
    public Guid ColumnId { get; set; }

    /// <summary>Overrides the dataset column's name in the header.</summary>
    public string? Header { get; set; }

    /// <summary>Pixel width kept after the user resizes the column.</summary>
    public int? Width { get; set; }

    /// <summary>Null falls back to right for numbers, left otherwise.</summary>
    public ColumnAlign? Align { get; set; }

    public bool Sortable { get; set; } = true;

    /// <summary>Pass/fail highlighting for this column's values. Null shows no banding.</summary>
    public ToleranceConfig? Tolerance { get; set; }
}

/// <summary>
/// Red/amber banding for a numeric column, resolved against one row of a
/// separate limits dataset so the same spec can be reused across columns and
/// reports. Min/Max is the in-spec range; the optional concession bounds
/// widen it into an amber "needs sign-off" zone before a value goes red.
/// </summary>
public class ToleranceConfig
{
    public int SourceDatasetId { get; set; }
    public Guid SourceRowId { get; set; }
    public Guid MinColumnId { get; set; }
    public Guid MaxColumnId { get; set; }
    public Guid? ConcessionLowerColumnId { get; set; }
    public Guid? ConcessionUpperColumnId { get; set; }
}

public class DataTableWidgetConfig : WidgetConfig
{
    /// <summary>Null until the user binds the table to a dataset.</summary>
    public int? DatasetId { get; set; }

    public bool ShowColumnHeaders { get; set; } = true;

    public bool ResizableColumns { get; set; }
    public bool StripedRows { get; set; }
    public bool ShowGridlines { get; set; }
    public bool RowHover { get; set; } = true;
    public TableDensity Density { get; set; } = TableDensity.Compact;

    public bool Paginator { get; set; }
    public int RowsPerPage { get; set; } = 10;

    public string EmptyMessage { get; set; } = "No rows to display.";

    /// <summary>Columns on the table. Empty means "every dataset column, in dataset order".</summary>
    public List<DataTableColumnSetting> Columns { get; set; } = new();

    public Guid? SortColumnId { get; set; }
    public SortDirection SortDirection { get; set; } = SortDirection.Asc;

    /// <summary>Rows this widget shows, narrowed server-side. Null means no widget-level filter.</summary>
    public FilterGroupDto? Filter { get; set; }
}
