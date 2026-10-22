namespace Reporting.Abstractions;

/// <summary>Where the absolute value sits against <see cref="KpiQueryDto.WarningThreshold"/>/<see cref="KpiQueryDto.CriticalThreshold"/> — independent of the trend/comparison.</summary>
public enum KpiStatus
{
    /// <summary>Thresholds are off, or there's no value yet.</summary>
    None,
    Good,
    Warning,
    Critical
}
