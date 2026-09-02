namespace Reporting.Abstractions;

public enum ChartAxis
{
    X,
    Y
}

/// <summary>Which side of the plot a value axis sits on.</summary>
public enum AxisSide
{
    Left,
    Right
}

/// <summary>
/// One value (Y) axis a chart plots against. A chart always has at least the primary
/// axis (the first in <see cref="ChartWidgetConfig.YAxes"/>); point charts can add
/// more so overlaid datasets with different scales each get a readable axis — the
/// echarts multi-axis / dual-axis chart. Purely a client-side render concern; the
/// server persists these but doesn't use them when querying.
/// </summary>
public class ChartValueAxis
{
    /// <summary>Client-generated, referenced by a binding's <see cref="ChartSeriesBinding.YAxisId"/> — not meaningful server-side.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Blank falls back to the bound column's name (primary axis) or a default label.</summary>
    public string Label { get; set; } = string.Empty;

    public AxisSide Side { get; set; } = AxisSide.Left;

    /// <summary>Fixed lower bound; null auto-fits. Ignored on a category axis.</summary>
    public double? Min { get; set; }

    /// <summary>Fixed upper bound; null auto-fits. Ignored on a category axis.</summary>
    public double? Max { get; set; }

    /// <summary>Plots this axis on a logarithmic scale. Ignored on a category axis.</summary>
    public bool LogScale { get; set; }
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

/// <summary>Where a box plot's whiskers end, and whether points beyond them are drawn as outliers.</summary>
public enum BoxWhisker
{
    /// <summary>Whiskers reach a multiple (see WhiskerFactor, default 1.5) of the IQR past the quartiles; values beyond are outliers.</summary>
    Tukey,

    /// <summary>Whiskers reach the group's actual minimum and maximum; nothing is treated as an outlier.</summary>
    MinMax,

    /// <summary>Whiskers reach a multiple (see WhiskerFactor, default 3) of the standard deviation either side of the mean; values beyond are outliers.</summary>
    StdDev
}

/// <summary>How a box plot orders its categories along the axis.</summary>
public enum BoxSort
{
    /// <summary>The category column's own order (numeric/chronological, else alphabetical).</summary>
    Category,

    /// <summary>By each category's pooled median, lowest first.</summary>
    MedianAsc,

    /// <summary>By each category's pooled median, highest first.</summary>
    MedianDesc,

    /// <summary>By each category's pooled spread (IQR), widest first — surfaces the least consistent groups.</summary>
    SpreadDesc
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

    /// <summary>
    /// Which value axis a <see cref="ChartAxis.Y"/> band draws against, by <see cref="ChartValueAxis.Id"/>;
    /// null falls back to the primary. Ignored for an X band. Client-side render concern; persisted only.
    /// </summary>
    public string? YAxisId { get; set; }

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

    /// <summary>
    /// Which value axis this binding plots against, by <see cref="ChartValueAxis.Id"/>.
    /// Null — or an id no longer among the chart's axes — falls back to the primary axis.
    /// </summary>
    public string? YAxisId { get; set; }

    /// <summary>Overrides the auto-assigned palette colour; null uses the palette. Client-side render concern; persisted only.</summary>
    public string? Color { get; set; }

    /// <summary>Point marker shape (circle/rect/triangle/diamond/none); null uses the chart kind's default.</summary>
    public string? Symbol { get; set; }

    /// <summary>Line dash (solid/dashed/dotted) for a line series; null draws solid.</summary>
    public string? DashStyle { get; set; }

    /// <summary>Blank falls back to the dataset/column name in the legend.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Rows this binding plots, narrowed server-side. Null means no per-series filter.</summary>
    public FilterGroupDto? Filter { get; set; }
}

/// <summary>
/// Shared configuration for every chart kind (scatter, line, and future bar/area).
/// Concrete kinds extend this with their own presentation options; the data-binding,
/// tolerance, and tooltip fields are common to all of them.
/// </summary>
public abstract class ChartWidgetConfig : WidgetConfig
{
    /// <summary>
    /// The datasets this chart overlays on its shared axes, each queried on its own
    /// dataset and its series merged on the client. At least one once the chart is set up.
    /// </summary>
    public List<ChartSeriesBinding> Bindings { get; set; } = new();

    /// <summary>
    /// The value (Y) axes this chart plots against, in order; the first is the primary.
    /// Point charts can carry several and assign each binding to one; a bar chart uses
    /// only the primary. Empty for charts saved before this existed — the client folds
    /// the deprecated <see cref="YAxisLabel"/> into a single primary axis on read.
    /// </summary>
    public List<ChartValueAxis> YAxes { get; set; } = new();

    /// <summary>Blank falls back to the bound column's own name.</summary>
    public string XAxisLabel { get; set; } = string.Empty;

    /// <summary>Deprecated: the primary axis's label now lives on <see cref="YAxes"/>. Kept so pre-multi-axis reports round-trip.</summary>
    public string YAxisLabel { get; set; } = string.Empty;

    /// <summary>Fixed X-axis bounds (null auto-fits) and log scale — the X counterparts of a value axis's own.</summary>
    public double? XAxisMin { get; set; }
    public double? XAxisMax { get; set; }
    public bool XLogScale { get; set; }

    /// <summary>Adds mouse-wheel/drag zoom plus a slider to point charts. On for new charts.</summary>
    public bool Zoom { get; set; } = true;

    public bool ShowLegend { get; set; } = true;
    public int PointSize { get; set; } = 8;

    /// <summary>Dashed reference lines for one or more specs plotted against an axis.</summary>
    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();

    /// <summary>Extra fields shown in a point's tooltip, in order, beyond the X/Y values.</summary>
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();
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

/// <summary>
/// A box-and-whisker chart. Like a bar chart it groups rows by its binding's category column
/// (<see cref="ChartSeriesBinding.XColumnId"/>), but instead of one aggregate it summarises each
/// group's values in the measure column (<see cref="ChartSeriesBinding.YColumnId"/>) into a
/// five-number summary (min, Q1, median, Q3, max) drawn as a box. A series column, if set, splits
/// each category into several boxes side by side.
/// </summary>
public class BoxPlotWidgetConfig : ChartWidgetConfig
{
    /// <summary>Where the whiskers end, and whether outliers are drawn beyond them.</summary>
    public BoxWhisker Whisker { get; set; } = BoxWhisker.Tukey;

    /// <summary>The whisker length multiplier — of the IQR for Tukey, of the standard deviation for StdDev. Ignored for MinMax.</summary>
    public double WhiskerFactor { get; set; } = 1.5;

    /// <summary>How the categories are ordered along the axis.</summary>
    public BoxSort Sort { get; set; } = BoxSort.Category;

    /// <summary>Draws the mean as a marker inside each box, alongside the median line.</summary>
    public bool ShowMean { get; set; }

    /// <summary>Prints each box's sample size (n) above it.</summary>
    public bool ShowSampleSize { get; set; }

    /// <summary>Overlays the individual measurements as jittered points over each box.</summary>
    public bool ShowPoints { get; set; }

    /// <summary>Adds process capability (Cp/Cpk) to each box's tooltip, resolved against the value-axis spec band.</summary>
    public bool ShowCapability { get; set; }

    /// <summary>Draws boxes horizontally (categories down the Y axis) rather than upright.</summary>
    public bool Horizontal { get; set; }
}
