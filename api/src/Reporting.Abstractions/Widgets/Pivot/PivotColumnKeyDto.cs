namespace Reporting.Abstractions;

/// <summary>One combination of column-field values.</summary>
public class PivotColumnKeyDto
{
    public List<string> Labels { get; set; } = new();

    /// <summary>Null when it can't be expressed.</summary>
    public FilterGroupDto? Drill { get; set; }
}
