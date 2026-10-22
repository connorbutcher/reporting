namespace Reporting.Abstractions;

/// <summary>What a histogram bar's height represents.</summary>
public enum HistogramNormalize
{
    /// <summary>The raw number of values falling in the bin.</summary>
    Count,

    /// <summary>The bin's share of all values (its count divided by the total), 0..1.</summary>
    Frequency,

    /// <summary>The probability density (count divided by total and bin width), so the bars integrate to 1.</summary>
    Density
}
