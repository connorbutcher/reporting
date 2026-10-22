namespace Reporting.Abstractions;

/// <summary>Against the absolute thresholds, independent of the trend.</summary>
public enum KpiStatus
{
    /// <summary>Thresholds are off, or there's no value yet.</summary>
    None,
    Good,
    Warning,
    Critical
}
