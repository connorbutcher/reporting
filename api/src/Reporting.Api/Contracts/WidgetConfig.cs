using System.Text.Json.Serialization;

namespace Reporting.Api.Contracts;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(DataTableWidgetConfig), typeDiscriminator: "dataTable")]
[JsonDerivedType(typeof(StaticTextWidgetConfig), typeDiscriminator: "staticText")]
public abstract class WidgetConfig
{
    public string Title { get; set; } = "Widget";
    public bool ShowTitle { get; set; } = true;
}

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

public enum TextFontWeight
{
    Normal,
    Medium,
    Semibold,
    Bold
}

public enum TextAlign
{
    Left,
    Center,
    Right,
    Justify
}

public enum TextVerticalAlign
{
    Top,
    Middle,
    Bottom
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
}

public class DataTableWidgetConfig : WidgetConfig
{
    /// <summary>Null until the user binds the table to a dataset.</summary>
    public Guid? DatasetId { get; set; }

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

public class StaticTextWidgetConfig : WidgetConfig
{
    /// <summary>Plain text; line breaks are preserved, never rendered as HTML.</summary>
    public string Content { get; set; } = string.Empty;

    public int FontSize { get; set; } = 16;
    public TextFontWeight FontWeight { get; set; } = TextFontWeight.Normal;
    public bool Italic { get; set; }
    public bool Underline { get; set; }
    public bool Strikethrough { get; set; }
    public double LineHeight { get; set; } = 1.4;

    public string Color { get; set; } = "#1f2937";

    /// <summary>Null means transparent.</summary>
    public string? BackgroundColor { get; set; }

    public TextAlign TextAlign { get; set; } = TextAlign.Left;
    public TextVerticalAlign VerticalAlign { get; set; } = TextVerticalAlign.Top;

    /// <summary>False lets long lines overflow with a scrollbar instead of wrapping.</summary>
    public bool Wrap { get; set; } = true;

    public int Padding { get; set; } = 12;
}
