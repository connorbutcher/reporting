namespace Reporting.Abstractions;

/// <summary>A value (Y) axis. Client-only: persisted but not used when querying.</summary>
public class ChartValueAxis
{
    /// <summary>Client-generated; referenced by <see cref="ChartSeriesBinding.YAxisId"/>.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Blank falls back to the bound column's name or a default label.</summary>
    public string Label { get; set; } = string.Empty;

    public AxisSide Side { get; set; } = AxisSide.Left;

    /// <summary>Null auto-fits.</summary>
    public double? Min { get; set; }

    /// <summary>Null auto-fits.</summary>
    public double? Max { get; set; }

    public bool LogScale { get; set; }

    /// <summary>Null lets the chart choose.</summary>
    public double? Interval { get; set; }

    /// <summary>"horizontal" or "vertical"; null keeps the chart's default.</summary>
    public string? Rotate { get; set; }

    /// <summary>Fits the axis to the data instead of anchoring it at zero.</summary>
    public bool? Scale { get; set; }
}
