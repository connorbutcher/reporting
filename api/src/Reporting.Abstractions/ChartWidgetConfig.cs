namespace Reporting.Abstractions;

public enum ChartAxis
{
    X,
    Y
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
/// Reference lines drawn on one axis, resolved against one row of a separate
/// limits dataset — the chart equivalent of a table column's <see cref="ToleranceConfig"/>.
/// A chart can carry several, e.g. one per spec being plotted.
/// </summary>
public class ChartToleranceBand
{
    /// <summary>Client-generated, only for addressing this band in the editor — not meaningful server-side.</summary>
    public string Id { get; set; } = string.Empty;

    public ChartAxis Axis { get; set; } = ChartAxis.Y;

    public int SourceDatasetId { get; set; }
    public Guid SourceRowId { get; set; }
    public Guid MinColumnId { get; set; }
    public Guid MaxColumnId { get; set; }
    public Guid? ConcessionLowerColumnId { get; set; }
    public Guid? ConcessionUpperColumnId { get; set; }

    /// <summary>Shades the in-spec zone (and any concession shoulders) between the band's lines.</summary>
    public bool Fill { get; set; }

    /// <summary>Outlines plotted points that fall outside this band's outermost line.</summary>
    public bool OutlinePoints { get; set; }
}

/// <summary>One extra field shown in a point's tooltip, beyond the X/Y values.</summary>
public class ChartTooltipColumn
{
    public Guid ColumnId { get; set; }
    public string? Prefix { get; set; }
    public string? Suffix { get; set; }
}

/// <summary>
/// One dataset's contribution to a chart: its dataset, axes, optional per-value
/// split, and row filter. A chart carries one or more of these; several overlaid
/// on shared axes is how two datasets are plotted against each other. Each binding
/// is queried on its own dataset and its series merged on the client.
/// </summary>
public class ChartSeriesBinding
{
    /// <summary>Client-generated, addresses this binding in the editor — not meaningful server-side.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Null until the user binds this series to a dataset.</summary>
    public int? DatasetId { get; set; }

    public Guid? XColumnId { get; set; }
    public Guid? YColumnId { get; set; }

    /// <summary>Splits this binding into a separate coloured series per distinct value. Null plots one.</summary>
    public Guid? SeriesColumnId { get; set; }

    /// <summary>Blank falls back to the dataset/column name in the legend.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Rows this binding plots, narrowed server-side. Null means no per-series filter.</summary>
    public FilterGroupDto? Filter { get; set; }
}

/// <summary>
/// Shared configuration for every chart kind (scatter, line, and future bar/area).
/// Concrete kinds extend this with their own presentation options; the data-binding,
/// tolerance, tooltip, and filter fields are common to all of them.
/// </summary>
public abstract class ChartWidgetConfig : WidgetConfig
{
    /// <summary>
    /// The datasets this chart overlays on its shared axes, each queried on its own
    /// dataset. Newer clients populate this; the flat fields below remain so reports
    /// saved before bindings existed still round-trip (the client folds them into a
    /// single binding on read).
    /// </summary>
    public List<ChartSeriesBinding> Bindings { get; set; } = new();

    /// <summary>Deprecated: superseded by <see cref="Bindings"/>. Kept for legacy reports.</summary>
    public int? DatasetId { get; set; }

    public Guid? XColumnId { get; set; }
    public Guid? YColumnId { get; set; }

    /// <summary>Deprecated: superseded by <see cref="Bindings"/>. Kept for legacy reports.</summary>
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
