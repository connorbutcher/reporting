namespace Reporting.Abstractions;

public enum HistogramBinMode
{
    Count,
    Width,

    /// <summary>Freedman–Diaconis, falling back to Sturges.</summary>
    Auto
}
