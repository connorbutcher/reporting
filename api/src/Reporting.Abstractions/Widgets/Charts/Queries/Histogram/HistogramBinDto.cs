namespace Reporting.Abstractions;

public class HistogramBinDto
{
    /// <summary>Inclusive.</summary>
    public double Lower { get; set; }

    /// <summary>Exclusive, except for the final bin.</summary>
    public double Upper { get; set; }

    /// <summary>e.g. "10 – 20".</summary>
    public string Label { get; set; } = string.Empty;
}
