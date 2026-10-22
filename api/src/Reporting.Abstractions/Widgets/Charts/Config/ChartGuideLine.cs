namespace Reporting.Abstractions;

/// <summary>
/// A single dashed line drawn at a fixed value on an axis, captioned with a short label —
/// the lightweight alternative to <see cref="ChartToleranceBand"/> for marking a target, a
/// cap, or any other fixed point that doesn't need resolving against a separate dataset row.
/// </summary>
public class ChartGuideLine
{
    /// <summary>Client-generated, only for addressing this line in the editor — not meaningful server-side.</summary>
    public string Id { get; set; } = string.Empty;

    public ChartAxis Axis { get; set; } = ChartAxis.Y;

    /// <summary>
    /// Which value axis a <see cref="ChartAxis.Y"/> line draws against, by <see cref="ChartValueAxis.Id"/>;
    /// null falls back to the primary. Ignored for an X line. Client-side render concern; persisted only.
    /// </summary>
    public string? YAxisId { get; set; }

    /// <summary>The line's fixed position on the axis.</summary>
    public double Value { get; set; }

    /// <summary>The region's other edge; null keeps this a single line rather than a shaded range.</summary>
    public double? ValueTo { get; set; }

    /// <summary>The caption drawn on the line; blank falls back to the formatted value.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Overrides the default guide colour; null uses the default.</summary>
    public string? Color { get; set; }

    /// <summary>Line dash (solid/dashed/dotted); null draws dashed.</summary>
    public string? DashStyle { get; set; }

    /// <summary>Shades the zone between <see cref="Value"/> and <see cref="ValueTo"/>. Ignored when <see cref="ValueTo"/> is null.</summary>
    public bool Fill { get; set; }

    /// <summary>Outlines plotted points on the wrong side of the line (or outside the range, once it's one).</summary>
    public bool OutlinePoints { get; set; }

    /// <summary>
    /// For a single-value line only (ignored once <see cref="ValueTo"/> is set): "above" or "below" —
    /// which side of <see cref="Value"/> is out of range. Null defaults to "above". Client-side render
    /// concern; persisted only.
    /// </summary>
    public string? Direction { get; set; }
}
