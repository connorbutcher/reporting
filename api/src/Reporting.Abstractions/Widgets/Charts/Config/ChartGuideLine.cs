namespace Reporting.Abstractions;

/// <summary>A labelled line (or shaded range) at a fixed axis value.</summary>
public class ChartGuideLine
{
    /// <summary>Client-generated editor id.</summary>
    public string Id { get; set; } = string.Empty;

    public ChartAxis Axis { get; set; } = ChartAxis.Y;

    /// <summary>Client-only. Null uses the primary value axis.</summary>
    public string? YAxisId { get; set; }

    public double Value { get; set; }

    /// <summary>Null draws a single line rather than a range.</summary>
    public double? ValueTo { get; set; }

    /// <summary>Blank falls back to the formatted value.</summary>
    public string Label { get; set; } = string.Empty;

    public string? Color { get; set; }

    /// <summary>solid/dashed/dotted; null draws dashed.</summary>
    public string? DashStyle { get; set; }

    /// <summary>Ignored when <see cref="ValueTo"/> is null.</summary>
    public bool Fill { get; set; }

    /// <summary>Outlines points on the wrong side of the line or outside the range.</summary>
    public bool OutlinePoints { get; set; }

    /// <summary>Client-only. "above" or "below" is out of range for a single line; null means "above".</summary>
    public string? Direction { get; set; }
}
