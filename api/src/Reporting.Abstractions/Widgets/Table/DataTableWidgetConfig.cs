namespace Reporting.Abstractions;

public class DataTableWidgetConfig : WidgetConfig
{
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

    /// <summary>Over every matched row, not just the page.</summary>
    public bool ShowTotals { get; set; }

    public bool ShowSearch { get; set; }

    public int FrozenColumns { get; set; }

    public bool RowDetails { get; set; } = true;

    /// <summary>In display order.</summary>
    public List<DataTableColumnSetting> Columns { get; set; } = new();

    public Guid? SortColumnId { get; set; }
    public SortDirection SortDirection { get; set; } = SortDirection.Asc;

    public FilterGroupDto? Filter { get; set; }
}
