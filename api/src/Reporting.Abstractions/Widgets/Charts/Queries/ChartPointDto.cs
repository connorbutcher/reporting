namespace Reporting.Abstractions;

public class ChartPointDto
{
    /// <summary>A number, or a string for a text axis; serialized by runtime type.</summary>
    public object X { get; set; } = 0d;
    public object Y { get; set; } = 0d;

    public double? Size { get; set; }

    /// <summary>Missing values are omitted.</summary>
    public List<string> TooltipLines { get; set; } = new();
}
