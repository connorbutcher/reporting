namespace Reporting.Abstractions;

/// <summary>One point of a sparkline's trailing history.</summary>
public class KpiHistoryPointDto
{
    public DateTime PeriodStart { get; set; }

    /// <summary>Null when the bucket had nothing to reduce.</summary>
    public double? Value { get; set; }
}
