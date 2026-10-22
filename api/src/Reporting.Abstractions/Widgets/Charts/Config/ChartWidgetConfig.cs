namespace Reporting.Abstractions;

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

    /// <summary>X-axis tick interval, label orientation, and fit-to-data — client-side render options, persisted only.</summary>
    public double? XAxisInterval { get; set; }
    public string? XAxisRotate { get; set; }
    public bool? XAxisScale { get; set; }

    /// <summary>Adds mouse-wheel/drag zoom plus a slider to point charts. On for new charts.</summary>
    public bool Zoom { get; set; } = true;

    /// <summary>
    /// Client-side render toggles, persisted only. Nullable so a config saved before one existed
    /// round-trips as absent and the client applies its own default (rather than the server forcing
    /// a concrete false onto an older chart).
    /// </summary>
    public bool? ZoomY { get; set; }
    public bool? ShowGridLines { get; set; }
    public bool? ShowValueLabels { get; set; }

    /// <summary>Colours point-chart marks by their Y value on a continuous scale (an echarts visualMap).</summary>
    public bool? ColorByValue { get; set; }

    /// <summary>Fits and draws a least-squares trend line per series (point charts only; ignored by grouping charts).</summary>
    public bool? ShowTrendLine { get; set; }

    public bool ShowLegend { get; set; } = true;
    public int PointSize { get; set; } = 8;

    /// <summary>Dashed reference lines for one or more specs plotted against an axis.</summary>
    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();

    /// <summary>Dashed, labelled lines at fixed values — the simpler alternative to a tolerance band.</summary>
    public List<ChartGuideLine> GuideLines { get; set; } = new();

    /// <summary>Extra fields shown in a point's tooltip, in order, beyond the X/Y values.</summary>
    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();
}
