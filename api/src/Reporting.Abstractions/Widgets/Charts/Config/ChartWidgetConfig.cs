namespace Reporting.Abstractions;

/// <summary>Configuration shared by every chart kind.</summary>
public abstract class ChartWidgetConfig : WidgetConfig
{
    public List<ChartSeriesBinding> Bindings { get; set; } = new();

    /// <summary>The first is the primary. Empty on older charts; the client folds <see cref="YAxisLabel"/> into one axis.</summary>
    public List<ChartValueAxis> YAxes { get; set; } = new();

    /// <summary>Blank falls back to the bound column's name.</summary>
    public string XAxisLabel { get; set; } = string.Empty;

    /// <summary>Deprecated in favour of <see cref="YAxes"/>; kept so older reports round-trip.</summary>
    public string YAxisLabel { get; set; } = string.Empty;

    public double? XAxisMin { get; set; }
    public double? XAxisMax { get; set; }
    public bool XLogScale { get; set; }

    public double? XAxisInterval { get; set; }
    public string? XAxisRotate { get; set; }
    public bool? XAxisScale { get; set; }

    public bool Zoom { get; set; } = true;

    // Nullable so older configs round-trip as absent and the client applies its own default.
    public bool? ZoomY { get; set; }
    public bool? ShowGridLines { get; set; }
    public bool? ShowValueLabels { get; set; }
    public bool? ColorByValue { get; set; }

    /// <summary>Point charts only.</summary>
    public bool? ShowTrendLine { get; set; }

    public bool ShowLegend { get; set; } = true;
    public int PointSize { get; set; } = 8;

    public List<ChartToleranceBand> ToleranceBands { get; set; } = new();

    public List<ChartGuideLine> GuideLines { get; set; } = new();

    public List<ChartTooltipColumn> TooltipColumns { get; set; } = new();
}
