namespace Reporting.Abstractions;

/// <summary>One tile of a grouped KPI — the reduced value for one distinct value of the group-by column.</summary>
public class KpiGroupResultDto
{
    public string Label { get; set; } = string.Empty;
    public double? Value { get; set; }
    public string? DisplayValue { get; set; }
    public KpiStatus Status { get; set; } = KpiStatus.None;
}
