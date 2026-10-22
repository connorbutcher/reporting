namespace Reporting.Abstractions;

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

    /// <summary>Forced tick interval; null lets the chart choose. Ignored on a category axis.</summary>
    public double? Interval { get; set; }

    /// <summary>Tick-label orientation ("horizontal" or "vertical"); null keeps the chart's default.</summary>
    public string? Rotate { get; set; }

    /// <summary>Fits the axis to the data instead of anchoring it at zero.</summary>
    public bool? Scale { get; set; }
}
