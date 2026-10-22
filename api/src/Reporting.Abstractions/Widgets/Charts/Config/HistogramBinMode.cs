namespace Reporting.Abstractions;

/// <summary>How a histogram chooses its bin edges.</summary>
public enum HistogramBinMode
{
    /// <summary>A fixed number of equal-width bins spanning the range (see BinCount).</summary>
    Count,

    /// <summary>Bins of a fixed width tiled across the range (see BinWidth).</summary>
    Width,

    /// <summary>The bin count is chosen automatically from the data (Freedman–Diaconis, falling back to Sturges).</summary>
    Auto
}
