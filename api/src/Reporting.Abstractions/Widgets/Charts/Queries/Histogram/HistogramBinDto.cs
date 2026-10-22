namespace Reporting.Abstractions;

/// <summary>One bin of a histogram: its half-open value range and a ready-made axis label.</summary>
public class HistogramBinDto
{
    /// <summary>The bin's inclusive lower edge.</summary>
    public double Lower { get; set; }

    /// <summary>The bin's exclusive upper edge (inclusive for the final bin).</summary>
    public double Upper { get; set; }

    /// <summary>A display label for the bin's range, e.g. "10 – 20".</summary>
    public string Label { get; set; } = string.Empty;
}
