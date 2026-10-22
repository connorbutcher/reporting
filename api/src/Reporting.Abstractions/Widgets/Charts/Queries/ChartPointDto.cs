namespace Reporting.Abstractions;

public class ChartPointDto
{
    /// <summary>A coordinate is a number for a numeric axis column, or a string for a text (category) one.
    /// Serialized by its runtime type, so the client reads <c>number | string</c>.</summary>
    public object X { get; set; } = 0d;
    public object Y { get; set; } = 0d;

    /// <summary>The bubble size column's value for this point; null when not bound or not set on this row.</summary>
    public double? Size { get; set; }

    /// <summary>One "prefix+value+suffix" entry per configured tooltip column, in order. Missing values are omitted.</summary>
    public List<string> TooltipLines { get; set; } = new();
}
