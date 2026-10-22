namespace Reporting.Abstractions;

/// <summary>One category's five-number summary for a series, already reduced from its rows.</summary>
public class BoxDto
{
    /// <summary>The lower whisker end: the actual minimum, or the smallest value inside the lower fence.</summary>
    public double Min { get; set; }
    public double Q1 { get; set; }
    public double Median { get; set; }
    public double Q3 { get; set; }

    /// <summary>The upper whisker end: the actual maximum, or the largest value inside the upper fence.</summary>
    public double Max { get; set; }

    /// <summary>The arithmetic mean, for the optional mean marker and capability (Cp/Cpk).</summary>
    public double Mean { get; set; }

    /// <summary>The sample standard deviation (n−1); 0 for a single value. Feeds capability and StdDev whiskers.</summary>
    public double StdDev { get; set; }

    /// <summary>How many rows fed this box, surfaced in the tooltip and the optional n label.</summary>
    public int Count { get; set; }

    /// <summary>A capped sample of the raw values behind this box, for the jittered overlay. Empty unless requested.</summary>
    public List<double> Points { get; set; } = new();

    /// <summary>Each tooltip column's average over this box's rows, formatted with its prefix/suffix.</summary>
    public List<string> TooltipLines { get; set; } = new();
}
