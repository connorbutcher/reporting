namespace Reporting.Abstractions;

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

    /// <summary>Shows a footer row with each column's <see cref="DataTableColumnSetting.Total"/>, over every matched row.</summary>
    public bool ShowTotals { get; set; }

    /// <summary>Shows a search box readers can use to narrow the rows to those containing some text.</summary>
    public bool ShowSearch { get; set; }

    /// <summary>How many leading columns stay put while the table scrolls sideways.</summary>
    public int FrozenColumns { get; set; }

    /// <summary>Clicking a row opens a panel listing every column of that row.</summary>
    public bool RowDetails { get; set; } = true;

    /// <summary>Columns on the table, in display order. Empty shows nothing until columns are added.</summary>
    public List<DataTableColumnSetting> Columns { get; set; } = new();

    public Guid? SortColumnId { get; set; }
    public SortDirection SortDirection { get; set; } = SortDirection.Asc;

    /// <summary>Rows this widget shows, narrowed server-side. Null means no widget-level filter.</summary>
    public FilterGroupDto? Filter { get; set; }
}
