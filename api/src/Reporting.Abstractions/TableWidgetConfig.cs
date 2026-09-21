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
/// Red/amber banding for a numeric column, resolved against a separate limits dataset so the same
/// spec can be reused across columns and reports. Min/Max is the in-spec range; the optional
/// concession bounds widen it into an amber "needs sign-off" zone before a value goes red.
///
/// By default every value is checked against one fixed row of the limits dataset
/// (<see cref="SourceRowId"/>). Opting in to <see cref="Match"/> instead picks the limits row per
/// data row, by matching a value in the row against a column of the limits dataset.
/// </summary>
public class ToleranceConfig
{
    public int SourceDatasetId { get; set; }

    /// <summary>The fixed limits row. Null when <see cref="Match"/> chooses the row per data row.</summary>
    public Guid? SourceRowId { get; set; }

    /// <summary>Opt-in: choose each data row's limits row by matching values, instead of one fixed row.</summary>
    public ToleranceMatch? Match { get; set; }

    public Guid MinColumnId { get; set; }
    public Guid MaxColumnId { get; set; }
    public Guid? ConcessionLowerColumnId { get; set; }
    public Guid? ConcessionUpperColumnId { get; set; }
}

/// <summary>
/// Picks a data row's limits row by value: the row of the limits dataset whose
/// <see cref="SourceColumnId"/> equals the data row's <see cref="ColumnId"/>. Text is compared
/// ignoring case and surrounding spaces, numbers by value. A row with no match, or an empty value,
/// simply isn't highlighted; if several limits rows share a value the first one wins.
/// </summary>
public class ToleranceMatch
{
    /// <summary>The column of the table's own dataset whose value identifies the row's spec.</summary>
    public Guid ColumnId { get; set; }

    /// <summary>The column of the limits dataset holding the same identifier.</summary>
    public Guid SourceColumnId { get; set; }
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
