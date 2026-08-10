using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(DataTableWidgetConfig), typeDiscriminator: "dataTable")]
[JsonDerivedType(typeof(StaticTextWidgetConfig), typeDiscriminator: "staticText")]
[JsonDerivedType(typeof(ChartWidgetConfig), typeDiscriminator: "chart")]
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
    public Guid SourceDatasetId { get; set; }
    public Guid SourceRowId { get; set; }
    public Guid MinColumnId { get; set; }
    public Guid MaxColumnId { get; set; }
    public Guid? ConcessionLowerColumnId { get; set; }
    public Guid? ConcessionUpperColumnId { get; set; }
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

public enum ChartType
{
    Scatter
}

public enum ChartAxis
{
    X,
    Y
}

/// <summary>
/// Reference lines drawn on one axis, resolved against one row of a separate
/// limits dataset — the chart equivalent of a table column's <see cref="ToleranceConfig"/>.
/// A chart can carry several, e.g. one per spec being plotted.
/// </summary>
public class ChartToleranceBand
{
    /// <summary>Client-generated, only for addressing this band in the editor — not meaningful server-side.</summary>
    public string Id { get; set; } = string.Empty;

    public ChartAxis Axis { get; set; } = ChartAxis.Y;

    public Guid SourceDatasetId { get; set; }
    public Guid SourceRowId { get; set; }
    public Guid MinColumnId { get; set; }
    public Guid MaxColumnId { get; set; }
    public Guid? ConcessionLowerColumnId { get; set; }
    public Guid? ConcessionUpperColumnId { get; set; }
}

/// <summary>One extra field shown in a point's tooltip, beyond the X/Y values.</summary>
public class ChartTooltipColumn
{
    public Guid ColumnId { get; set; }
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }
}

public class ChartWidgetConfig : WidgetConfig
{
    public ChartType ChartType { get; set; } = ChartType.Scatter;

    /// <summary>Null until the user binds the chart to a dataset.</summary>
    public Guid? DatasetId { get; set; }

    public Guid? XColumnId { get; set; }
    public Guid? YColumnId { get; set; }

    /// <summary>Splits points into a separate coloured series per distinct value. Null plots one series.</summary>
    public Guid? SeriesColumnId { get; set; }

    /// <summary>Blank falls back to the bound column's own name.</summary>
    public string XAxisLabel { get; set; } = string.Empty;
    public string YAxisLabel { get; set; } = string.Empty;

    public bool ShowLegend { get; set; } = true;
    public int PointSize { get; set; } = 8;

    /// <summary>Dashed reference lines for one or more specs plotted against an axis.</summary>
    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();

    /// <summary>Extra fields shown in a point's tooltip, in order, beyond the X/Y values.</summary>
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();

    /// <summary>Rows this chart plots, narrowed server-side. Null means no widget-level filter.</summary>
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
