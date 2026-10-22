namespace Reporting.Abstractions;

/// <summary>The smallest and largest number in a column across every matched row, for scaling data bars.</summary>
public class TableColumnStatsDto
{
    public double? Min { get; set; }
    public double? Max { get; set; }
}
