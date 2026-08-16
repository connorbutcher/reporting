using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(DataTableWidgetConfig), typeDiscriminator: "dataTable")]
[JsonDerivedType(typeof(StaticTextWidgetConfig), typeDiscriminator: "staticText")]
[JsonDerivedType(typeof(ScatterChartWidgetConfig), typeDiscriminator: "scatterChart")]
[JsonDerivedType(typeof(LineChartWidgetConfig), typeDiscriminator: "lineChart")]
[JsonDerivedType(typeof(BarChartWidgetConfig), typeDiscriminator: "barChart")]
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

/// <summary>
/// Shared configuration for every chart kind (scatter, line, and future bar/area).
/// Concrete kinds extend this with their own presentation options; the data-binding,
/// tolerance, tooltip, and filter fields are common to all of them.
/// </summary>
public abstract class ChartWidgetConfig : WidgetConfig
{
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

/// <summary>A scatter chart: X/Y points, one mark per row.</summary>
public class ScatterChartWidgetConfig : ChartWidgetConfig
{
}

/// <summary>A line chart, with its own line-specific presentation options.</summary>
public class LineChartWidgetConfig : ChartWidgetConfig
{
    /// <summary>Draws the line with curved rather than straight segments.</summary>
    public bool Smooth { get; set; }
    /// <summary>Whether point markers are drawn along the line.</summary>
    public bool ShowPoints { get; set; } = true;
    /// <summary>Shades the area under the line.</summary>
    public bool AreaFill { get; set; }
}

/// <summary>How a bar chart reduces the many rows in one category down to a single bar height.</summary>
public enum Aggregate
{
    Sum,
    Average,
    Count,
    Min,
    Max
}

/// <summary>
/// A bar chart: unlike scatter/line it doesn't plot raw rows. Rows are grouped by
/// the category column (<see cref="ChartWidgetConfig.XColumnId"/>) and each group's
/// values in the measure column (<see cref="ChartWidgetConfig.YColumnId"/>) are
/// reduced to one bar by <see cref="Aggregate"/>. The measure is unused — and may be
/// left unbound — when the aggregate is <see cref="Aggregate.Count"/>, which counts
/// rows. A series column, if set, splits each category into grouped (or stacked) bars.
/// </summary>
public class BarChartWidgetConfig : ChartWidgetConfig
{
    public Aggregate Aggregate { get; set; } = Aggregate.Sum;

    /// <summary>Stacks a category's series bars into one column instead of placing them side by side.</summary>
    public bool Stacked { get; set; }

    /// <summary>Draws bars horizontally (categories down the Y axis) rather than as vertical columns.</summary>
    public bool Horizontal { get; set; }
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
