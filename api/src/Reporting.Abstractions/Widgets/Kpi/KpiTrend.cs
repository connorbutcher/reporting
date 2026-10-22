namespace Reporting.Abstractions;

/// <summary>Which way the headline number moved since the comparison value.</summary>
public enum KpiTrend
{
    /// <summary>No comparison value to measure against (ComparisonMode is None, or a window had nothing to reduce).</summary>
    Unknown,
    Up,
    Down,
    Flat
}
