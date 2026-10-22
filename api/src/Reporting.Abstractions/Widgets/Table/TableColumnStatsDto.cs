namespace Reporting.Abstractions;

/// <summary>Across every matched row, for scaling data bars.</summary>
public class TableColumnStatsDto
{
    public double? Min { get; set; }
    public double? Max { get; set; }
}
