namespace Reporting.Abstractions;

public class BoxDto
{
    /// <summary>The lower whisker end.</summary>
    public double Min { get; set; }
    public double Q1 { get; set; }
    public double Median { get; set; }
    public double Q3 { get; set; }

    /// <summary>The upper whisker end.</summary>
    public double Max { get; set; }

    public double Mean { get; set; }

    /// <summary>Sample (n−1); 0 for a single value.</summary>
    public double StdDev { get; set; }

    public int Count { get; set; }

    /// <summary>A capped sample of raw values; empty unless requested.</summary>
    public List<double> Points { get; set; } = new();

    /// <summary>Each tooltip column's average over this box's rows.</summary>
    public List<string> TooltipLines { get; set; } = new();
}
