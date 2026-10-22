namespace Reporting.Abstractions;

/// <summary>One combination of column-field values: a group of value columns across the top.</summary>
public class PivotColumnKeyDto
{
    /// <summary>The formatted value of each column field, in order.</summary>
    public List<string> Labels { get; set; } = new();

    /// <summary>Conditions selecting the rows behind this column, for drill-through; null when they can't be expressed.</summary>
    public FilterGroupDto? Drill { get; set; }
}
