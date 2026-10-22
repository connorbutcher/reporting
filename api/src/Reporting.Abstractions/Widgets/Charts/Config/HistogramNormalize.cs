namespace Reporting.Abstractions;

/// <summary>What a histogram bar's height represents.</summary>
public enum HistogramNormalize
{
    Count,

    /// <summary>Share of all values, 0..1.</summary>
    Frequency,

    /// <summary>Count / (total × bin width), so the bars integrate to 1.</summary>
    Density
}
